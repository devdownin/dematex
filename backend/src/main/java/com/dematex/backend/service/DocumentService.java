package com.dematex.backend.service;

import com.dematex.backend.dto.*;
import com.dematex.backend.model.*;
import com.dematex.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.*;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Service central gérant le cycle de vie des documents réglementaires.
 *
 * Ce service implémente une stratégie hybride :
 * 1. Source de vérité : Le système de fichiers physique (structure Recipient/Entity/Type).
 * 2. Index de performance : Une base de données JPA (H2) synchronisée périodiquement.
 */
@Service @RequiredArgsConstructor @Slf4j
public class DocumentService {

    /** Délai maximum (SLA) pour recevoir la preuve juridique AR3 (2 jours). */
    private static final Duration AR3_SLA = Duration.ofDays(2);

    private final DocumentRepository documentRepository;

    @Value("${storage.root:./regulatory_files}")
    private String storageRoot;

    /**
     * Récupère une liste paginée de documents en utilisant l'index JPA.
     * Cette approche permet des filtrages complexes et une pagination efficace (Cursor-based).
     */
    public PaginatedResponse<DocumentDTO> getDocuments(String entityCode, DocumentType type, String periodStart, String periodEnd, AcknowledgementType status, String cursor, Boolean lateOnly, int limit) {
        Instant lateThreshold = Instant.now().minus(AR3_SLA);

        // Utilisation du repository avec les filtres dynamiques SQL
        List<Document> documents = documentRepository.findDocumentsWithFilters(
                entityCode, type, periodStart, periodEnd, status, cursor, lateOnly, lateThreshold, PageRequest.of(0, limit + 1));

        boolean hasMore = documents.size() > limit;
        List<Document> resultList = hasMore ? documents.subList(0, limit) : documents;
        String nextCursor = resultList.isEmpty() ? null : resultList.get(resultList.size() - 1).getDocumentId();

        // Conversion vers les DTOs pour l'API
        List<DocumentDTO> dtos = resultList.stream().map(this::convertToDTO).collect(Collectors.toList());
        return new PaginatedResponse<>(dtos, hasMore ? nextCursor : null, hasMore);
    }

    /**
     * Calcule les statistiques du tableau de bord.
     * Les résultats sont mis en cache via Caffeine pour optimiser les temps de réponse.
     */
    @org.springframework.cache.annotation.Cacheable("stats")
    public DashboardStats getStats() {
        List<DocumentDTO> allDocs = documentRepository.findAll().stream().map(this::convertToDTO).toList();
        long total = allDocs.size();
        long ar3 = allDocs.stream().filter(d -> d.getStatus() == AcknowledgementType.AR3).count();
        long late = allDocs.stream().filter(DocumentDTO::isLate).count();

        return DashboardStats.builder()
                .totalDocuments(total)
                .ar3Completed(ar3)
                .ar3Pending(total - ar3)
                .ar3CompletionRate(total > 0 ? (double) ar3 / total * 100 : 0)
                .lateDocuments(late)
                .build();
    }

    public Optional<DocumentDTO> getDocument(String documentId) {
        return documentRepository.findById(documentId).map(this::convertToDTO);
    }

    /**
     * Lit le contenu binaire d'un document directement depuis le stockage physique.
     */
    public byte[] getFileContent(String documentId) throws IOException {
        Path filePath = findFileOnDisk(documentId);
        return Files.readAllBytes(filePath);
    }

    /**
     * Enregistre un accusé de réception (AR).
     * 1. Renomme le fichier physique (l'extension porte le statut, ex: doc.ALIRE -> doc.AR3).
     * 2. Met à jour l'index JPA.
     * En cas de verrouillage fichier temporaire, l'opération est rejouée automatiquement.
     */
    @Transactional
    @org.springframework.retry.annotation.Retryable(value = IOException.class, maxAttempts = 3, backoff = @org.springframework.retry.annotation.Backoff(delay = 1000))
    public void addAcknowledgement(String entityCode, String documentId, AcknowledgementType type, String details) throws IOException {
        Path currentPath = findFileOnDisk(documentId);
        String filename = currentPath.getFileName().toString();
        String baseName = filename.substring(0, filename.lastIndexOf('.'));
        String newExtension = "." + type.name();

        Path newPath = currentPath.resolveSibling(baseName + newExtension);
        Files.move(currentPath, newPath, StandardCopyOption.REPLACE_EXISTING);

        Document doc = documentRepository.findById(documentId).orElseThrow();
        doc.setStatus(type);
        documentRepository.save(doc);

        log.info("Status mis à jour : {} -> {} (Fichier renommé en {})", documentId, type, newPath);
    }

    /**
     * Tâche synchronisant l'index JPA avec l'état réel du filesystem.
     * S'exécute au démarrage de l'application et toutes les minutes.
     */
    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(fixedDelay = 60000)
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "stats", allEntries = true)
    public void syncFileSystemToIndex() {
        log.info("Démarrage de la synchronisation filesystem -> index...");
        List<Document> onDisk = scanFileSystem();

        // Rafraîchissement complet de l'index pour garantir la cohérence
        documentRepository.deleteAll();
        documentRepository.saveAll(onDisk);

        log.info("Synchronisation terminée. {} documents indexés.", onDisk.size());
    }

    /**
     * Scanne récursivement la structure : storage_root/{issuer}/{entity}/{type}/file
     */
    private List<Document> scanFileSystem() {
        List<Document> docs = new ArrayList<>();
        Path root = Paths.get(storageRoot).toAbsolutePath();
        if (!Files.exists(root)) return docs;

        try (Stream<Path> recipients = Files.list(root)) {
            recipients.filter(Files::isDirectory).forEach(recPath -> {
                String recipient = recPath.getFileName().toString();
                try (Stream<Path> entities = Files.list(recPath)) {
                    entities.filter(Files::isDirectory).forEach(entPath -> {
                        String entity = entPath.getFileName().toString();
                        try (Stream<Path> types = Files.list(entPath)) {
                            types.filter(Files::isDirectory).forEach(typePath -> {
                                String typeStr = typePath.getFileName().toString();
                                try (Stream<Path> files = Files.list(typePath)) {
                                    files.filter(Files::isRegularFile).forEach(filePath -> {
                                        docs.add(mapFileToEntity(recipient, entity, typeStr, filePath));
                                    });
                                } catch (IOException ignored) {}
                            });
                        } catch (IOException ignored) {}
                    });
                } catch (IOException ignored) {}
            });
        } catch (IOException e) {
            log.error("Erreur lors du scan du filesystem", e);
        }
        return docs;
    }

    /**
     * Extrait les métadonnées d'un fichier à partir de son chemin et de son extension.
     */
    private Document mapFileToEntity(String recipient, String entity, String typeStr, Path filePath) {
        String filename = filePath.getFileName().toString();
        int lastDot = filename.lastIndexOf('.');
        String docId = filename.substring(0, lastDot);
        String ext = filename.substring(lastDot + 1);

        Document doc = new Document();
        doc.setDocumentId(docId);
        doc.setEntityCode(entity);
        doc.setIssuerCode(recipient);
        try { doc.setType(DocumentType.valueOf(typeStr)); } catch (Exception e) { doc.setType(DocumentType.REFERENTIEL); }

        // Mappe l'extension vers le type d'AR (status)
        if (ext.equalsIgnoreCase("ALIRE")) {
            doc.setStatus(AcknowledgementType.AR0);
        } else {
            try { doc.setStatus(AcknowledgementType.valueOf(ext)); } catch (Exception e) { doc.setStatus(AcknowledgementType.AR0); }
        }

        // Date de création basée sur la date système du fichier
        try { doc.setCreatedAt(Files.getLastModifiedTime(filePath).toInstant()); } catch (IOException e) { doc.setCreatedAt(Instant.now()); }
        doc.setUpdatedAt(doc.getCreatedAt());
        doc.setPeriod("2024-01"); // Exemple statique
        return doc;
    }

    private Path findFileOnDisk(String documentId) throws IOException {
        return Files.walk(Paths.get(storageRoot))
                .filter(p -> p.getFileName().toString().startsWith(documentId + "."))
                .findFirst()
                .orElseThrow(() -> new IOException("Document " + documentId + " introuvable sur le disque"));
    }

    /**
     * Convertit une entité persistante en objet de transfert (DTO) pour le frontend.
     * Inclut le calcul dynamique de la deadline SLA.
     */
    private DocumentDTO convertToDTO(Document doc) {
        DocumentDTO dto = new DocumentDTO();
        dto.setDocumentId(doc.getDocumentId());
        dto.setType(doc.getType());
        dto.setEntityCode(doc.getEntityCode());
        dto.setIssuerCode(doc.getIssuerCode());
        dto.setPeriod(doc.getPeriod());
        dto.setStatus(doc.getStatus());
        dto.setCreatedAt(doc.getCreatedAt());
        dto.setUpdatedAt(doc.getUpdatedAt());

        // Calcul du SLA : si pas en AR3 après 2 jours, le document est considéré "en retard"
        Instant deadline = doc.getCreatedAt().plus(AR3_SLA);
        dto.setDeadline(deadline);
        dto.setLate(doc.getStatus() != AcknowledgementType.AR3 && Instant.now().isAfter(deadline));

        return dto;
    }

    public List<Acknowledgement> getAcknowledgements(String documentId) {
        return Collections.emptyList();
    }
}

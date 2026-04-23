package com.dematex.backend.service;

import com.dematex.backend.dto.*;
import com.dematex.backend.model.*;
import com.dematex.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
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
    private final AcknowledgementRepository acknowledgementRepository;
    private final AuditLogRepository auditLogRepository;
    private final EventService eventService;

    @Value("${storage.root:./regulatory_files}")
    private String storageRoot;

    private Instant lastScanTimestamp = Instant.EPOCH;

    @Scheduled(cron = "${storage.purge.cron:0 0 3 * * *}")
    @Transactional
    public void purgeExpiredDocuments() {
        log.info("Démarrage de la purge des documents expirés...");
        Instant now = Instant.now();
        Instant sixMonthsAgo = now.minus(Duration.ofDays(180));
        Instant oneYearAgo = now.minus(Duration.ofDays(365));

        List<Document> allDocuments = documentRepository.findAll();
        List<Document> toDelete = allDocuments.stream()
                .filter(doc -> isExpired(doc, sixMonthsAgo, oneYearAgo))
                .toList();

        for (Document doc : toDelete) {
            try {
                Path path = findFileOnDisk(doc.getDocumentId());
                Files.deleteIfExists(path);
                documentRepository.delete(doc);
                
                auditLogRepository.save(AuditLog.builder()
                        .user("system")
                        .action("PURGE_DOCUMENT")
                        .resource(doc.getDocumentId())
                        .issuerCode(doc.getIssuerCode())
                        .status("EXPIRED")
                        .build());
                
                log.info("Document purgé : {}", doc.getDocumentId());
            } catch (IOException e) {
                log.error("Erreur lors de la purge du document {}", doc.getDocumentId(), e);
            }
        }
        log.info("Purge terminée. {} documents supprimés.", toDelete.size());
    }

    private boolean isExpired(Document doc, Instant sixMonthsAgo, Instant oneYearAgo) {
        // CRMENS et Fichiers de réception : 6 mois
        // Fichiers d'émission : 1 an (Pour l'instant, on n'a pas encore le flag direction, on applique 6 mois par défaut sauf si spécifié)
        if (doc.getType() == DocumentType.CRMENS) {
            return doc.getCreatedAt().isBefore(sixMonthsAgo);
        }
        
        // Par défaut 6 mois pour le moment (VTIS, FTIS, PTIS sont reçus)
        return doc.getCreatedAt().isBefore(sixMonthsAgo);
    }

    /**
     * Récupère une liste paginée de documents en utilisant l'index JPA.
     * Cette approche permet des filtrages complexes et une pagination efficace (Cursor-based).
     */
    public PaginatedResponse<DocumentDTO> getDocuments(String entityCode, String issuerCode, DocumentType type, ClientType clientType, String periodStart, String periodEnd, AcknowledgementType status, String cursor, String search, Boolean lateOnly, int limit) {
        Instant lateThreshold = Instant.now().minus(AR3_SLA);
        String normalizedSearch = normalizeSearch(search);

        List<Document> documents = documentRepository.findDocumentsWithFilters(
                entityCode, issuerCode, type, clientType, periodStart, periodEnd, status, cursor, normalizedSearch, lateOnly, lateThreshold, PageRequest.of(0, limit + 1));
        long totalCount = documentRepository.countDocumentsWithFilters(
                entityCode, issuerCode, type, clientType, periodStart, periodEnd, status, normalizedSearch, lateOnly, lateThreshold);

        boolean hasMore = documents.size() > limit;
        List<Document> resultList = hasMore ? documents.subList(0, limit) : documents;
        String nextCursor = resultList.isEmpty() ? null : resultList.get(resultList.size() - 1).getDocumentId();

        List<DocumentDTO> dtos = resultList.stream().map(this::convertToDTO).collect(Collectors.toList());
        return new PaginatedResponse<>(dtos, hasMore ? nextCursor : null, hasMore, totalCount);
    }

    public DashboardStats getStats(String issuerCode) {
        long total;
        long ar3;
        long late;
        Instant lateThreshold = Instant.now().minus(AR3_SLA);

        if (issuerCode != null) {
            total = documentRepository.countByIssuerCode(issuerCode);
            ar3 = documentRepository.countByIssuerCodeAndStatus(issuerCode, AcknowledgementType.AR3);
            late = documentRepository.countLateDocumentsByIssuer(issuerCode, lateThreshold);
        } else {
            total = documentRepository.count();
            ar3 = documentRepository.countByStatus(AcknowledgementType.AR3);
            late = documentRepository.countLateDocuments(lateThreshold);
        }

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

    @Transactional
    public void recordDocumentDownload(String documentId) {
        documentRepository.findById(documentId).ifPresent(doc -> {
            auditLogRepository.save(AuditLog.builder()
                    .user(getCurrentUsername())
                    .action("DOWNLOAD_DOCUMENT")
                    .resource(documentId)
                    .issuerCode(doc.getIssuerCode())
                    .status("SIGNED_URL")
                    .build());
        });
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

        acknowledgementRepository.save(Acknowledgement.builder()
                .documentId(documentId)
                .entityCode(entityCode)
                .type(type)
                .details(details)
                .build());

        auditLogRepository.save(AuditLog.builder()
                .user(getCurrentUsername())
                .action("ACK_UPDATE")
                .resource(documentId)
                .issuerCode(doc.getIssuerCode())
                .status(type.name())
                .build());

        log.info("Status mis à jour : {} -> {} (Fichier renommé en {})", documentId, type, newPath);
        eventService.broadcast("doc-updated", Map.of("documentId", documentId, "status", type));
        eventService.broadcast("alerts-updated", Map.of("documentId", documentId, "status", type));
    }

    /**
     * Tâche synchronisant l'index JPA avec l'état réel du filesystem.
     * S'exécute au démarrage de l'application et toutes les minutes.
     * Optimisation 1 : Sync incrémental basé sur la date de modification.
     */
    @Scheduled(initialDelay = 5000, fixedDelay = 60000)
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "stats", allEntries = true)
    public void syncFileSystemToIndex() {
        log.info("Démarrage de la synchronisation filesystem -> index (Incremental)...");
        Instant currentScanTime = Instant.now();
        
        Collection<Document> onDisk = scanFileSystem();
        
        // Filtrer pour ne traiter que les nouveaux ou modifiés (Optimisation 1)
        List<Document> toProcess = onDisk.stream()
                .filter(d -> d.getCreatedAt().isAfter(lastScanTimestamp))
                .toList();

        if (toProcess.isEmpty()) {
            log.info("Aucun changement détecté sur le filesystem.");
            lastScanTimestamp = currentScanTime;
            return;
        }

        List<Document> inDb = documentRepository.findAll();
        Set<String> inDbIds = inDb.stream().map(Document::getDocumentId).collect(Collectors.toSet());

        // Update or Add
        List<Document> toSave = new ArrayList<>();
        for (Document diskDoc : toProcess) {
            if (!inDbIds.contains(diskDoc.getDocumentId())) {
                auditLogRepository.save(AuditLog.builder()
                        .user("system")
                        .action("RECEIVE_DOCUMENT")
                        .resource(diskDoc.getType().name())
                        .documentId(diskDoc.getDocumentId())
                        .issuerCode(diskDoc.getIssuerCode())
                        .status("RECEIVED")
                        .build());
                log.info("Nouveau document détecté : {}", diskDoc.getDocumentId());
            }
            toSave.add(diskDoc);
        }
        documentRepository.saveAll(toSave);

        // Delete (toujours nécessaire pour refléter les suppressions manuelles)
        Map<String, Document> onDiskMap = onDisk.stream()
                .collect(Collectors.toMap(Document::getDocumentId, d -> d));
        List<String> toDelete = inDbIds.stream()
                .filter(id -> !onDiskMap.containsKey(id))
                .collect(Collectors.toList());
        if (!toDelete.isEmpty()) {
            documentRepository.deleteAllById(toDelete);
        }

        lastScanTimestamp = currentScanTime;
        log.info("Synchronisation terminée. {} documents traités, {} au total.", toProcess.size(), onDisk.size());
    }

    /**
     * Scanne récursivement la structure : storage_root/{issuer}/{entity}/{type}/file
     */
    private Collection<Document> scanFileSystem() {
        Map<String, Document> docs = new HashMap<>();
        Path root = Paths.get(storageRoot).toAbsolutePath();
        if (!Files.exists(root)) return docs.values();

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
                                        // On mappe l'entité. Le calcul du hash ne se fera que si nécessaire 
                                        // (implémenté dans mapFileToEntity)
                                        Document doc = mapFileToEntity(recipient, entity, typeStr, filePath);
                                        docs.put(doc.getDocumentId(), doc);
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
        return docs.values();
    }

    /**
     * Extrait les métadonnées d'un fichier à partir de son chemin et de son extension.
     */
    private Document mapFileToEntity(String recipient, String entity, String typeStr, Path filePath) {
        String filename = filePath.getFileName().toString();
        int lastDot = filename.lastIndexOf('.');
        String docId = filename.substring(0, lastDot);
        String ext = filename.substring(lastDot + 1);

        String uniqueDocId = recipient + "_" + entity + "_" + docId;

        Document doc = new Document();
        doc.setDocumentId(uniqueDocId);
        doc.setEntityCode(entity);
        doc.setIssuerCode(recipient);
        try { doc.setType(DocumentType.valueOf(typeStr)); } catch (Exception e) { doc.setType(DocumentType.CRMENS); }
        doc.setClientType(inferClientType(uniqueDocId));

        if (ext.equalsIgnoreCase("ALIRE")) {
            doc.setStatus(AcknowledgementType.AR0);
        } else {
            try { doc.setStatus(AcknowledgementType.valueOf(ext)); } catch (Exception e) { doc.setStatus(AcknowledgementType.AR0); }
        }

        try { 
            Instant mtime = Files.getLastModifiedTime(filePath).toInstant();
            doc.setCreatedAt(mtime);
            // Optimisation 3 : On ne calcule le hash que pour les nouveaux fichiers
            if (mtime.isAfter(lastScanTimestamp)) {
                doc.setHash(calculateSHA256(filePath));
            }
        } catch (Exception e) { 
            doc.setCreatedAt(Instant.now()); 
        }
        doc.setUpdatedAt(doc.getCreatedAt());

        String period = "2024-01";
        if (filename.startsWith("doc_") && filename.length() >= 10) {
            String yyyymm = filename.substring(4, 10);
            period = yyyymm.substring(0, 4) + "-" + yyyymm.substring(4, 6);
        }
        doc.setPeriod(period);
        return doc;
    }

    private Path findFileOnDisk(String documentId) throws IOException {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IOException("Document " + documentId + " introuvable en base"));

        String recipient = doc.getIssuerCode();
        String entity = doc.getEntityCode();
        String type = doc.getType().name();

        String prefix = recipient + "_" + entity + "_";
        String baseName = documentId.startsWith(prefix)
                ? documentId.substring(prefix.length())
                : documentId;

        Path targetPath = Paths.get(storageRoot, recipient, entity, type);
        if (Files.exists(targetPath)) {
            try (Stream<Path> files = Files.list(targetPath)) {
                Optional<Path> found = files
                        .filter(p -> p.getFileName().toString().startsWith(baseName + "."))
                        .findFirst();
                if (found.isPresent()) return found.get();
            }
        }

        Path parentPath = Paths.get(storageRoot, recipient, entity);
        if (Files.exists(parentPath)) {
            try (Stream<Path> files = Files.walk(parentPath)) {
                Optional<Path> found = files
                        .filter(Files::isRegularFile)
                        .filter(p -> p.getFileName().toString().startsWith(baseName + "."))
                        .findFirst();
                if (found.isPresent()) return found.get();
            }
        }

        throw new IOException("Document " + documentId + " introuvable sur le disque");
    }

    /**
     * Convertit une entité persistante en objet de transfert (DTO) pour le frontend.
     * Optimisation 3 : Utilise le hash persistant.
     */
    private DocumentDTO convertToDTO(Document doc) {
        DocumentDTO dto = new DocumentDTO();
        dto.setDocumentId(doc.getDocumentId());
        dto.setType(doc.getType());
        dto.setClientType(doc.getClientType());
        dto.setEntityCode(doc.getEntityCode());
        dto.setIssuerCode(doc.getIssuerCode());
        dto.setPeriod(doc.getPeriod());
        dto.setStatus(doc.getStatus());
        dto.setCreatedAt(doc.getCreatedAt());
        dto.setUpdatedAt(doc.getUpdatedAt());
        dto.setHash(doc.getHash());

        Instant deadline = doc.getCreatedAt().plus(AR3_SLA);
        dto.setDeadline(deadline);
        dto.setLate(doc.getStatus() != AcknowledgementType.AR3 && Instant.now().isAfter(deadline));

        if (doc.getAlerts() != null) {
            dto.setAlerts(doc.getAlerts().stream()
                    .filter(alert -> alert.getResolvedAt() == null)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    private String calculateSHA256(Path path) throws NoSuchAlgorithmException, IOException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream is = Files.newInputStream(path);
             BufferedInputStream bis = new BufferedInputStream(is);
             DigestInputStream dis = new DigestInputStream(bis, digest)) {
            byte[] buffer = new byte[8192];
            while (dis.read(buffer) != -1) {
            }
        }
        byte[] encodedHash = digest.digest();
        StringBuilder hexString = new StringBuilder(2 * encodedHash.length);
        for (byte b : encodedHash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }

    public List<Acknowledgement> getAcknowledgements(String documentId) {
        return acknowledgementRepository.findByDocumentIdOrderByTimestampAsc(documentId);
    }

    public List<AuditLog> getAuditLogs(String issuerCode) {
        if (issuerCode == null) {
            return auditLogRepository.findAllByOrderByTimestampDesc();
        }
        return auditLogRepository.findByIssuerCodeOrderByTimestampDesc(issuerCode);
    }

    public byte[] exportDocumentsCsv(String entityCode, String issuerCode, DocumentType type, ClientType clientType, String periodStart, String periodEnd, AcknowledgementType status, String search, Boolean lateOnly) {
        Instant lateThreshold = Instant.now().minus(AR3_SLA);
        String normalizedSearch = normalizeSearch(search);
        List<DocumentDTO> documents = documentRepository.findDocumentsWithFilters(
                        entityCode,
                        issuerCode,
                        type,
                        clientType,
                        periodStart,
                        periodEnd,
                        status,
                        null,
                        normalizedSearch,
                        lateOnly,
                        lateThreshold,
                        PageRequest.of(0, 10000))
                .stream()
                .map(this::convertToDTO)
                .toList();

        StringBuilder csv = new StringBuilder("documentId,type,clientType,entityCode,issuerCode,period,status,createdAt,updatedAt,deadline,isLate,hash\n");
        for (DocumentDTO document : documents) {
            csv.append(csv(document.getDocumentId())).append(',')
                    .append(csv(document.getType())).append(',')
                    .append(csv(document.getClientType())).append(',')
                    .append(csv(document.getEntityCode())).append(',')
                    .append(csv(document.getIssuerCode())).append(',')
                    .append(csv(document.getPeriod())).append(',')
                    .append(csv(document.getStatus())).append(',')
                    .append(csv(document.getCreatedAt())).append(',')
                    .append(csv(document.getUpdatedAt())).append(',')
                    .append(csv(document.getDeadline())).append(',')
                    .append(document.isLate()).append(',')
                    .append(csv(document.getHash()))
                    .append('\n');
        }

        auditLogRepository.save(AuditLog.builder()
                .user(getCurrentUsername())
                .action("EXPORT_DOCUMENTS")
                .resource(entityCode != null ? entityCode : "GLOBAL")
                .issuerCode(issuerCode)
                .status("CSV")
                .build());

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] exportAuditCsv(String issuerCode) {
        List<AuditLog> logs = getAuditLogs(issuerCode);
        StringBuilder csv = new StringBuilder("timestamp,user,action,resource,issuerCode,status\n");
        for (AuditLog log : logs) {
            csv.append(csv(log.getTimestamp())).append(',')
                    .append(csv(log.getUser())).append(',')
                    .append(csv(log.getAction())).append(',')
                    .append(csv(log.getResource())).append(',')
                    .append(csv(log.getIssuerCode())).append(',')
                    .append(csv(log.getStatus()))
                    .append('\n');
        }

        auditLogRepository.save(AuditLog.builder()
                .user(getCurrentUsername())
                .action("EXPORT_AUDIT")
                .resource("AUDIT_LOG")
                .issuerCode(issuerCode)
                .status("CSV")
                .build());

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    public List<Map<String, Object>> getLatencyTrends(String granularity, String issuerCode) {
        List<Map<String, Object>> trends = new ArrayList<>();
        Instant now = Instant.now();

        int points;
        Duration step;

        switch (granularity) {
            case "weekly":
                points = 8;
                step = Duration.ofDays(7);
                break;
            case "monthly":
                points = 6;
                step = Duration.ofDays(30);
                break;
            default: // daily
                points = 7;
                step = Duration.ofDays(1);
                break;
        }

        long total = issuerCode != null
                ? documentRepository.countByIssuerCode(issuerCode)
                : documentRepository.count();
        for (int i = points - 1; i >= 0; i--) {
            Instant date = now.minus(step.multipliedBy(i));
            Map<String, Object> data = new HashMap<>();
            data.put("date", date.toString().substring(0, 10));
            data.put("count", total);
            trends.add(data);
        }
        return trends;
    }

    private String normalizeSearch(String search) {
        if (search == null) {
            return null;
        }
        String trimmed = search.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ClientType inferClientType(String stableKey) {
        ClientType[] values = ClientType.values();
        return values[Math.floorMod(stableKey.hashCode(), values.length)];
    }

    private String getCurrentUsername() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return ((User) principal).getUsername();
        }
        return "system";
    }

    private String csv(Object value) {
        if (value == null) {
            return "";
        }
        String raw = String.valueOf(value);
        return "\"" + raw.replace("\"", "\"\"") + "\"";
    }
}

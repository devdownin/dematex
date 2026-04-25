package com.dematex.backend.service;

import com.dematex.backend.dto.*;
import com.dematex.backend.exception.AckAlreadyAppliedException;
import com.dematex.backend.exception.InvalidAckTransitionException;
import com.dematex.backend.exception.ResourceNotFoundException;
import com.dematex.backend.exception.StorageException;
import com.dematex.backend.model.*;
import com.dematex.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.Base64;
import java.util.EnumSet;

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

    @org.springframework.scheduling.annotation.Scheduled(cron = "${storage.purge.cron:0 0 3 * * *}")
    @Transactional
    public void purgeExpiredDocuments() {
        log.info("Démarrage de la purge des documents expirés...");
        Instant now = Instant.now();
        Instant sixMonthsAgo = now.minus(Duration.ofDays(180));

        // Purge par lots pour éviter de charger toute la base en mémoire
        int pageSize = 500;
        int page = 0;
        long totalDeleted = 0;
        Page<Document> toDeletePage;

        do {
            // Parcours paginé avec garde-fou pour éviter de charger toute la base d'un coup.
            toDeletePage = documentRepository.findAll(PageRequest.of(page, pageSize));
            List<Document> expiredInBatch = toDeletePage.getContent().stream()
                    .filter(doc -> isExpired(doc, sixMonthsAgo))
                    .toList();

            for (Document doc : expiredInBatch) {
                try {
                    Path path = findFileOnDisk(doc.getDocumentId());
                    Files.deleteIfExists(path);
                    documentRepository.delete(doc);

                    auditLogRepository.save(AuditLog.builder()
                            .user("system")
                            .action("PURGE_DOCUMENT")
                            .resource(doc.getDocumentId())
                            .issuerCode(doc.getIssuerCode())
                            .entityCode(doc.getEntityCode())
                            .status("EXPIRED")
                            .build());

                    totalDeleted++;
                } catch (Exception e) {
                    log.error("Erreur lors de la purge du document {}", doc.getDocumentId(), e);
                }
            }
            page++;
        } while (toDeletePage.hasNext() && page < 100); // Limite de sécurité pour éviter les boucles infinies

        log.info("Purge terminée. {} documents supprimés.", totalDeleted);
    }

    private boolean isExpired(Document doc, Instant sixMonthsAgo) {
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

    private static final Map<AcknowledgementType, Set<AcknowledgementType>> ACK_TRANSITIONS = Map.of(
            AcknowledgementType.AR0, EnumSet.of(AcknowledgementType.AR2, AcknowledgementType.AR3, AcknowledgementType.AR4),
            AcknowledgementType.AR2, EnumSet.of(AcknowledgementType.AR3, AcknowledgementType.AR4),
            AcknowledgementType.AR3, Collections.emptySet(),
            AcknowledgementType.AR4, Collections.emptySet()
    );

    public PaginatedResponse<DeliveryDTO> getDeliveries(String issuerCode, String entityCode, Instant since, String cursorStr, int limit) {
        Instant cursorTs = null;
        String cursorDocId = null;
        if (cursorStr != null) {
            try {
                String decoded = new String(Base64.getUrlDecoder().decode(cursorStr));
                int sep = decoded.indexOf('|');
                if (sep <= 0) throw new IllegalArgumentException("missing separator");
                cursorTs = Instant.ofEpochMilli(Long.parseLong(decoded.substring(0, sep)));
                cursorDocId = decoded.substring(sep + 1);
            } catch (Exception e) {
                throw new com.dematex.backend.exception.BusinessException("INVALID_CURSOR: valeur de cursor illégale");
            }
        }

        List<Document> docs = documentRepository.findDeliveriesSince(
                issuerCode, entityCode, since, cursorTs, cursorDocId,
                PageRequest.of(0, limit + 1));
        long total = documentRepository.countDeliveriesSince(issuerCode, entityCode, since);

        boolean hasMore = docs.size() > limit;
        List<Document> page = hasMore ? docs.subList(0, limit) : docs;
        String nextCursor = null;
        if (hasMore && !page.isEmpty()) {
            Document last = page.get(page.size() - 1);
            String raw = last.getUpdatedAt().toEpochMilli() + "|" + last.getDocumentId();
            nextCursor = Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes());
        }

        List<DeliveryDTO> dtos = page.stream().map(this::convertToDeliveryDTO).collect(Collectors.toList());
        return new PaginatedResponse<>(dtos, nextCursor, hasMore, total);
    }

    public byte[] exportDeliveries(String issuerCode, String entityCode, Instant since, String format) {
        List<Document> docs = documentRepository.findDeliveriesSince(
                issuerCode, entityCode, since, null, null,
                PageRequest.of(0, 50000));
        List<DeliveryDTO> dtos = docs.stream().map(this::convertToDeliveryDTO).collect(Collectors.toList());

        if ("jsonl".equalsIgnoreCase(format)) {
            return buildJsonlExport(dtos);
        }
        return buildCsvDeliveryExport(dtos);
    }

    private byte[] buildJsonlExport(List<DeliveryDTO> dtos) {
        StringBuilder sb = new StringBuilder();
        for (DeliveryDTO d : dtos) {
            sb.append("{\"fileId\":").append(jsonStr(d.getFileId()))
              .append(",\"issuer\":").append(jsonStr(d.getIssuer()))
              .append(",\"entity\":").append(jsonStr(d.getEntity()))
              .append(",\"type\":").append(jsonStr(d.getType()))
              .append(",\"period\":").append(jsonStr(d.getPeriod()))
              .append(",\"status\":").append(jsonStr(d.getStatus()))
              .append(",\"updatedAt\":").append(jsonStr(d.getUpdatedAt()))
              .append(",\"receivedAt\":").append(jsonStr(d.getReceivedAt()))
              .append(",\"size\":").append(d.getSize())
              .append(",\"sha256\":").append(jsonStr(d.getSha256()))
              .append(",\"originalFilename\":").append(jsonStr(d.getOriginalFilename()))
              .append(",\"mimeType\":").append(jsonStr(d.getMimeType()))
              .append(",\"isLate\":").append(d.isLate())
              .append(",\"deadline\":").append(jsonStr(d.getDeadline()))
              .append(",\"downloadUrl\":").append(jsonStr(d.getDownloadUrl()))
              .append("}\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] buildCsvDeliveryExport(List<DeliveryDTO> dtos) {
        StringBuilder sb = new StringBuilder("fileId,issuer,entity,type,period,status,updatedAt,receivedAt,size,sha256,originalFilename,mimeType,isLate,deadline,downloadUrl\n");
        for (DeliveryDTO d : dtos) {
            sb.append(csv(d.getFileId())).append(',')
              .append(csv(d.getIssuer())).append(',')
              .append(csv(d.getEntity())).append(',')
              .append(csv(d.getType())).append(',')
              .append(csv(d.getPeriod())).append(',')
              .append(csv(d.getStatus())).append(',')
              .append(csv(d.getUpdatedAt())).append(',')
              .append(csv(d.getReceivedAt())).append(',')
              .append(d.getSize() != null ? d.getSize() : "").append(',')
              .append(csv(d.getSha256())).append(',')
              .append(csv(d.getOriginalFilename())).append(',')
              .append(csv(d.getMimeType())).append(',')
              .append(d.isLate()).append(',')
              .append(csv(d.getDeadline())).append(',')
              .append(csv(d.getDownloadUrl()))
              .append('\n');
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional
    public AcknowledgementResultDTO addAcknowledgementIdempotent(
            String entityCode, String documentId,
            AcknowledgementType ackType, String idempotencyKey,
            String externalReference, Instant ackTimestamp, String comment) {

        if (idempotencyKey != null) {
            Optional<Acknowledgement> existing = acknowledgementRepository.findByIdempotencyKeyAndDocumentId(idempotencyKey, documentId);
            if (existing.isPresent()) {
                Acknowledgement ack = existing.get();
                return AcknowledgementResultDTO.builder()
                        .documentId(documentId)
                        .status(ack.getType())
                        .idempotencyKey(idempotencyKey)
                        .appliedAt(ack.getTimestamp())
                        .alreadyApplied(true)
                        .build();
            }
        }

        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document non trouvé: " + documentId));

        validateAckTransition(doc.getStatus(), ackType);

        Instant now = Instant.now();
        performAcknowledgement(doc.getEntityCode(), documentId, ackType,
                buildDetails(externalReference, comment, ackTimestamp));

        try {
            Acknowledgement saved = acknowledgementRepository.save(Acknowledgement.builder()
                    .documentId(documentId)
                    .entityCode(doc.getEntityCode())
                    .type(ackType)
                    .idempotencyKey(idempotencyKey)
                    .externalReference(externalReference)
                    .ackTimestamp(ackTimestamp)
                    .comment(comment)
                    .details(buildDetails(externalReference, comment, ackTimestamp))
                    .build());

            return AcknowledgementResultDTO.builder()
                    .documentId(documentId)
                    .status(ackType)
                    .idempotencyKey(idempotencyKey)
                    .appliedAt(saved.getTimestamp() != null ? saved.getTimestamp() : now)
                    .alreadyApplied(false)
                    .build();
        } catch (DataIntegrityViolationException e) {
            // Concurrent request with same idempotency key — re-read and return the winner
            Acknowledgement existing = acknowledgementRepository
                    .findByIdempotencyKeyAndDocumentId(idempotencyKey, documentId)
                    .orElseThrow(() -> e);
            return AcknowledgementResultDTO.builder()
                    .documentId(documentId)
                    .status(existing.getType())
                    .idempotencyKey(idempotencyKey)
                    .appliedAt(existing.getTimestamp())
                    .alreadyApplied(true)
                    .build();
        }
    }

    public BatchAcknowledgementResult addAcknowledgementsBatch(BatchAcknowledgementRequest request) {
        List<BatchAcknowledgementResult.ItemResult> results = new ArrayList<>();
        int succeeded = 0;
        int failed = 0;

        for (BatchAcknowledgementRequest.Item item : request.getItems()) {
            try {
                AcknowledgementResultDTO result = addAcknowledgementIdempotent(
                        null, item.getDocumentId(), item.getAckType(),
                        item.getIdempotencyKey(), item.getExternalReference(),
                        item.getAckTimestamp(), item.getComment());

                results.add(BatchAcknowledgementResult.ItemResult.builder()
                        .documentId(item.getDocumentId())
                        .idempotencyKey(item.getIdempotencyKey())
                        .ackType(item.getAckType())
                        .resultStatus(result.isAlreadyApplied() ? "ALREADY_APPLIED" : "OK")
                        .alreadyApplied(result.isAlreadyApplied())
                        .appliedAt(result.getAppliedAt())
                        .build());
                succeeded++;
            } catch (ResourceNotFoundException e) {
                results.add(errorItem(item, "DOCUMENT_NOT_FOUND", e.getMessage()));
                failed++;
            } catch (InvalidAckTransitionException e) {
                results.add(errorItem(item, "INVALID_STATE_TRANSITION", e.getMessage()));
                failed++;
            } catch (Exception e) {
                results.add(errorItem(item, "ERROR", e.getMessage()));
                failed++;
            }
        }

        return BatchAcknowledgementResult.builder()
                .total(request.getItems().size())
                .succeeded(succeeded)
                .failed(failed)
                .results(results)
                .build();
    }

    private BatchAcknowledgementResult.ItemResult errorItem(BatchAcknowledgementRequest.Item item, String code, String message) {
        return BatchAcknowledgementResult.ItemResult.builder()
                .documentId(item.getDocumentId())
                .idempotencyKey(item.getIdempotencyKey())
                .ackType(item.getAckType())
                .resultStatus("ERROR")
                .errorCode(code)
                .errorMessage(message)
                .build();
    }

    private void validateAckTransition(AcknowledgementType current, AcknowledgementType requested) {
        Set<AcknowledgementType> allowed = ACK_TRANSITIONS.getOrDefault(current, Collections.emptySet());
        if (!allowed.contains(requested)) {
            throw new InvalidAckTransitionException(current, requested, allowed);
        }
    }

    private String buildDetails(String externalReference, String comment, Instant ackTimestamp) {
        StringBuilder sb = new StringBuilder();
        if (externalReference != null) sb.append("ref=").append(externalReference);
        if (comment != null) { if (!sb.isEmpty()) sb.append(";"); sb.append("comment=").append(comment); }
        if (ackTimestamp != null) { if (!sb.isEmpty()) sb.append(";"); sb.append("ackTs=").append(ackTimestamp); }
        return sb.isEmpty() ? null : sb.toString();
    }

    private DeliveryDTO convertToDeliveryDTO(Document doc) {
        Instant deadline = doc.getCreatedAt().plus(AR3_SLA);
        return DeliveryDTO.builder()
                .fileId(doc.getDocumentId())
                .issuer(doc.getIssuerCode())
                .entity(doc.getEntityCode())
                .type(doc.getType())
                .period(doc.getPeriod())
                .status(doc.getStatus())
                .updatedAt(doc.getUpdatedAt())
                .receivedAt(doc.getCreatedAt())
                .size(doc.getFileSize())
                .sha256(doc.getHash())
                .originalFilename(doc.getOriginalFilename())
                .mimeType(inferMimeType(doc.getOriginalFilename()))
                .isLate(doc.getStatus() != AcknowledgementType.AR3 && Instant.now().isAfter(deadline))
                .deadline(deadline)
                .downloadUrl("/api/v1/documents/" + doc.getDocumentId() + "/content")
                .build();
    }

    private String inferMimeType(String filename) {
        if (filename == null) return "application/octet-stream";
        String lower = filename.toLowerCase();
        if (lower.endsWith(".xml")) return "application/xml";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".csv")) return "text/csv";
        if (lower.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    private String jsonStr(Object value) {
        if (value == null) return "null";
        return "\"" + String.valueOf(value).replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
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

    public DocumentDTO getDocumentOrThrow(String documentId) {
        return documentRepository.findById(documentId)
                .map(this::convertToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Document non trouvé: " + documentId));
    }

    public Optional<DocumentDTO> getDocument(String documentId) {
        return documentRepository.findById(documentId).map(this::convertToDTO);
    }

    /**
     * Retourne une ressource permettant le streaming d'un document directement depuis le disque.
     */
    public Resource getFileAsResource(String documentId) {
        try {
            Path filePath = findFileOnDisk(documentId);
            if (!Files.exists(filePath)) {
                throw new ResourceNotFoundException("Fichier non trouvé sur le disque pour " + documentId);
            }
            return new FileSystemResource(filePath);
        } catch (IOException e) {
            throw new StorageException("Impossible d'accéder au fichier pour " + documentId, e);
        }
    }

    /**
     * Lit le contenu binaire d'un document directement depuis le stockage physique.
     */
    public byte[] getFileContent(String documentId) {
        try {
            Path filePath = findFileOnDisk(documentId);
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            throw new StorageException("Impossible de lire le fichier pour " + documentId, e);
        }
    }

    @Transactional
    public void recordDocumentDownload(String documentId) {
        documentRepository.findById(documentId).ifPresent(doc -> {
            auditLogRepository.save(AuditLog.builder()
                    .user(getCurrentUsername())
                    .action("DOWNLOAD_DOCUMENT")
                    .resource(documentId)
                    .issuerCode(doc.getIssuerCode())
                    .entityCode(doc.getEntityCode())
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
    @org.springframework.retry.annotation.Retryable(value = {IOException.class, StorageException.class}, maxAttempts = 3, backoff = @org.springframework.retry.annotation.Backoff(delay = 1000))
    public void addAcknowledgement(String entityCode, String documentId, AcknowledgementType type, String details) {
        performAcknowledgement(entityCode, documentId, type, details);
        acknowledgementRepository.save(Acknowledgement.builder()
                .documentId(documentId)
                .entityCode(entityCode)
                .type(type)
                .details(details)
                .build());
    }

    // Méthode interne — la logique de retry est portée par addAcknowledgement (portal) ;
    // le chemin ETL laisse propager StorageException et délègue le retry à l'appelant via Idempotency-Key.
    void performAcknowledgement(String entityCode, String documentId, AcknowledgementType type, String details) {
        try {
            Path currentPath = findFileOnDisk(documentId);
            String filename = currentPath.getFileName().toString();
            String baseName = filename.substring(0, filename.lastIndexOf('.'));
            String newExtension = "." + type.name();

            Path newPath = currentPath.resolveSibling(baseName + newExtension);
            Files.move(currentPath, newPath, StandardCopyOption.REPLACE_EXISTING);

            Document doc = documentRepository.findById(documentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Document non trouvé en base: " + documentId));
            doc.setStatus(type);
            doc.setOriginalFilename(newPath.getFileName().toString());
            documentRepository.save(doc);

            auditLogRepository.save(AuditLog.builder()
                    .user(getCurrentUsername())
                    .action("ACK_UPDATE")
                    .resource(documentId)
                    .issuerCode(doc.getIssuerCode())
                    .entityCode(doc.getEntityCode())
                    .status(type.name())
                    .build());

            log.info("Status mis à jour : {} -> {} (Fichier renommé en {})", documentId, type, newPath);
            eventService.broadcast("doc-updated", Map.of("documentId", documentId, "status", type));
            eventService.broadcast("alerts-updated", Map.of("documentId", documentId, "status", type));
        } catch (IOException e) {
            throw new StorageException("Erreur lors de la mise à jour de l'accusé de réception sur disque", e);
        }
    }

    /**
     * Synchronisation complète de l'index JPA avec l'état réel du filesystem.
     * Utilisée au bootstrap et comme filet de sécurité manuel.
     */
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "stats", allEntries = true)
    public void syncFileSystemToIndex() {
        log.info("Démarrage de la synchronisation filesystem -> index (Optimized)...");
        Instant syncStartTime = Instant.now();
        Instant scanBaseline = resolveScanBaseline();
        
        Collection<Document> onDisk = scanFileSystem(scanBaseline, syncStartTime);
        if (onDisk.isEmpty()) {
            log.info("Filesystem vide ou inaccessible.");
            // On ne supprime rien ici par sécurité si c'est vide (ex: montage réseau déconnecté)
            return;
        }

        // 1. Identifier les nouveaux ou modifiés pour mise à jour complète
        List<Document> toSave = onDisk.stream()
                .filter(d -> d.getCreatedAt().isAfter(scanBaseline))
                .collect(Collectors.toList());

        Set<String> existingCandidateIds = resolveExistingCandidateIds(toSave);
        List<AuditLog> receiveLogs = toSave.stream()
                .filter(d -> !existingCandidateIds.contains(d.getDocumentId()))
                .map(d -> AuditLog.builder()
                        .user("system")
                        .action("RECEIVE_DOCUMENT")
                        .resource(d.getDocumentId())
                        .documentId(d.getDocumentId())
                        .issuerCode(d.getIssuerCode())
                        .entityCode(d.getEntityCode())
                        .status("RECEIVED")
                        .build())
                .toList();

        if (!receiveLogs.isEmpty()) {
            auditLogRepository.saveAll(receiveLogs);
        }

        if (!toSave.isEmpty()) {
            int batchSize = 500;
            for (int i = 0; i < toSave.size(); i += batchSize) {
                List<Document> batch = toSave.subList(i, Math.min(i + batchSize, toSave.size()));
                documentRepository.saveAll(batch);
                log.info("Synchronisation : lot de {} documents sauvegardé.", batch.size());
            }
        }

        // 2. Pour tous les autres déjà en base, mettre à jour lastSeenAt par lots
        List<String> allDiskIds = onDisk.stream().map(Document::getDocumentId).toList();
        int batchSize = 500;
        for (int i = 0; i < allDiskIds.size(); i += batchSize) {
            List<String> batch = allDiskIds.subList(i, Math.min(i + batchSize, allDiskIds.size()));
            documentRepository.markAsSeen(batch, syncStartTime);
        }

        // 3. Supprimer ce qui n'a pas été vu pendant ce scan (et qui n'était pas un nouveau document)
        // On laisse une petite marge de sécurité de 10 secondes
        documentRepository.deleteByLastSeenAtBefore(syncStartTime.minusSeconds(10));

        lastScanTimestamp = syncStartTime;
        log.info("Synchronisation terminée. {} nouveaux/modifiés, {} créations audit, {} au total sur disque.", toSave.size(), receiveLogs.size(), onDisk.size());
    }

    /**
     * Réindexe uniquement la portée impactée par un changement filesystem.
     */
    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "stats", allEntries = true)
    public void syncAffectedPath(Path changedPath) {
        Path root = getStorageRootPath();
        Path normalizedPath = changedPath.toAbsolutePath().normalize();
        if (!normalizedPath.startsWith(root)) {
            log.debug("Chemin ignoré hors périmètre de stockage: {}", normalizedPath);
            return;
        }

        Path relative = root.relativize(normalizedPath);
        if (relative.getNameCount() == 0) {
            syncFileSystemToIndex();
            return;
        }

        Instant syncStartTime = Instant.now();
        if (relative.getNameCount() >= 3) {
            syncTypeScope(
                    relative.getName(0).toString(),
                    relative.getName(1).toString(),
                    relative.getName(2).toString(),
                    syncStartTime);
        } else if (relative.getNameCount() == 2) {
            syncEntityScope(
                    relative.getName(0).toString(),
                    relative.getName(1).toString(),
                    syncStartTime);
        } else {
            syncIssuerScope(relative.getName(0).toString(), syncStartTime);
        }

        lastScanTimestamp = syncStartTime;
        log.info("Synchronisation incrémentale terminée pour {}", normalizedPath);
    }

    /**
     * Scanne récursivement la structure : storage_root/{issuer}/{entity}/{type}/file
     * Optimisation : Scan parallèle et récupération des attributs en une seule passe.
     */
    private Collection<Document> scanFileSystem(Instant scanBaseline, Instant syncStartTime) {
        Path root = getStorageRootPath();
        if (!Files.exists(root)) return Collections.emptyList();

        Map<String, Document> allDocs = new java.util.concurrent.ConcurrentHashMap<>();

        try (Stream<Path> recipients = Files.list(root)) {
            recipients.filter(Files::isDirectory)
                    .parallel() // Scan en parallèle au niveau des émetteurs (destinataires)
                    .forEach(recPath -> {
                        String recipient = recPath.getFileName().toString();
                        scanRecipient(recPath, recipient, allDocs, scanBaseline, syncStartTime);
                    });
        } catch (IOException e) {
            log.error("Erreur lors du scan du filesystem", e);
        }
        return allDocs.values();
    }

    private void scanRecipient(Path recPath, String recipient, Map<String, Document> allDocs, Instant scanBaseline, Instant syncStartTime) {
        try {
            Files.walkFileTree(recPath, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                    Path relative = recPath.relativize(file);
                    // Structure attendue : {entity}/{type}/{file}
                    if (relative.getNameCount() == 3) {
                        String entity = relative.getName(0).toString();
                        String typeStr = relative.getName(1).toString();
                        Document doc = mapFileToEntity(recipient, entity, typeStr, file, attrs, scanBaseline, syncStartTime);
                        allDocs.put(doc.getDocumentId(), doc);
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            log.error("Erreur lors du scan du destinataire {}", recipient, e);
        }
    }

    /**
     * Extrait les métadonnées d'un fichier à partir de son chemin et de ses attributs.
     */
    private Document mapFileToEntity(String recipient, String entity, String typeStr, Path filePath, BasicFileAttributes attrs, Instant scanBaseline, Instant syncStartTime) {
        return mapFileToEntity(recipient, entity, typeStr, filePath, attrs, scanBaseline, syncStartTime, null);
    }

    private Document mapFileToEntity(String recipient, String entity, String typeStr, Path filePath, BasicFileAttributes attrs, Instant scanBaseline, Instant syncStartTime, Document existingDocument) {
        String filename = filePath.getFileName().toString();
        int lastDot = filename.lastIndexOf('.');
        String docId = lastDot > 0 ? filename.substring(0, lastDot) : filename;
        String ext = lastDot > 0 ? filename.substring(lastDot + 1) : "";

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

        Instant mtime = attrs.lastModifiedTime().toInstant();
        doc.setCreatedAt(mtime);
        doc.setUpdatedAt(mtime);
        doc.setLastSeenAt(syncStartTime);
        doc.setFileSize(attrs.size());
        doc.setOriginalFilename(filename);

        boolean shouldCalculateHash = existingDocument == null
                || existingDocument.getCreatedAt() == null
                || mtime.isAfter(scanBaseline)
                || !mtime.equals(existingDocument.getCreatedAt());
        if (shouldCalculateHash) {
            try {
                doc.setHash(calculateSHA256(filePath));
            } catch (Exception e) {
                log.error("Erreur lors du calcul du hash pour {}", filePath, e);
            }
        } else if (existingDocument != null) {
            doc.setHash(existingDocument.getHash());
        }

        String period = "2024-01";
        if (filename.startsWith("doc_") && filename.length() >= 10) {
            String yyyymm = filename.substring(4, 10);
            period = yyyymm.substring(0, 4) + "-" + yyyymm.substring(4, 6);
        }
        doc.setPeriod(period);
        return doc;
    }

    private void syncIssuerScope(String issuer, Instant syncStartTime) {
        Path issuerPath = getStorageRootPath().resolve(issuer);
        List<Document> existingDocs = documentRepository.findByIssuerCode(issuer);
        if (!Files.isDirectory(issuerPath)) {
            if (!existingDocs.isEmpty()) {
                documentRepository.deleteAllInBatch(existingDocs);
            }
            return;
        }

        Set<String> scopedEntities = new HashSet<>();
        for (Document document : existingDocs) {
            scopedEntities.add(document.getEntityCode());
        }

        try (DirectoryStream<Path> entityDirs = Files.newDirectoryStream(issuerPath, Files::isDirectory)) {
            for (Path entityDir : entityDirs) {
                scopedEntities.add(entityDir.getFileName().toString());
            }
        } catch (IOException e) {
            throw new StorageException("Erreur lors de la lecture de l'émetteur " + issuer, e);
        }

        for (String entity : scopedEntities) {
            syncEntityScope(issuer, entity, syncStartTime);
        }
    }

    private void syncEntityScope(String issuer, String entity, Instant syncStartTime) {
        Path entityPath = getStorageRootPath().resolve(issuer).resolve(entity);
        List<Document> existingDocs = documentRepository.findByIssuerCodeAndEntityCode(issuer, entity);
        if (!Files.isDirectory(entityPath)) {
            if (!existingDocs.isEmpty()) {
                documentRepository.deleteAllInBatch(existingDocs);
            }
            return;
        }

        Set<String> scopedTypes = new HashSet<>();
        for (Document document : existingDocs) {
            scopedTypes.add(document.getType().name());
        }

        try (DirectoryStream<Path> typeDirs = Files.newDirectoryStream(entityPath, Files::isDirectory)) {
            for (Path typeDir : typeDirs) {
                scopedTypes.add(typeDir.getFileName().toString());
            }
        } catch (IOException e) {
            throw new StorageException("Erreur lors de la lecture de l'entité " + issuer + "/" + entity, e);
        }

        for (String typeName : scopedTypes) {
            syncTypeScope(issuer, entity, typeName, syncStartTime);
        }
    }

    private void syncTypeScope(String issuer, String entity, String typeName, Instant syncStartTime) {
        DocumentType type = parseDocumentType(typeName);
        if (type == null) {
            log.warn("Type de document ignoré pour la synchro incrémentale: {}", typeName);
            return;
        }

        Path typePath = getStorageRootPath().resolve(issuer).resolve(entity).resolve(typeName);
        List<Document> existingDocs = documentRepository.findByIssuerCodeAndEntityCodeAndType(issuer, entity, type);
        Map<String, Document> existingById = existingDocs.stream()
                .collect(Collectors.toMap(Document::getDocumentId, doc -> doc, (left, right) -> left, HashMap::new));

        if (!Files.isDirectory(typePath)) {
            if (!existingDocs.isEmpty()) {
                documentRepository.deleteAllInBatch(existingDocs);
            }
            return;
        }

        List<Document> toSave = new ArrayList<>();
        List<AuditLog> receiveLogs = new ArrayList<>();
        List<String> unchangedIds = new ArrayList<>();
        Set<String> currentIds = new HashSet<>();

        try (DirectoryStream<Path> files = Files.newDirectoryStream(typePath, Files::isRegularFile)) {
            for (Path file : files) {
                BasicFileAttributes attrs = Files.readAttributes(file, BasicFileAttributes.class);
                String documentId = buildDocumentId(issuer, entity, file.getFileName().toString());
                Document existingDocument = existingById.get(documentId);
                Document mappedDocument = mapFileToEntity(
                        issuer,
                        entity,
                        typeName,
                        file,
                        attrs,
                        Instant.EPOCH,
                        syncStartTime,
                        existingDocument);
                currentIds.add(mappedDocument.getDocumentId());

                if (existingDocument == null) {
                    toSave.add(mappedDocument);
                    receiveLogs.add(AuditLog.builder()
                            .user("system")
                            .action("RECEIVE_DOCUMENT")
                            .resource(mappedDocument.getDocumentId())
                            .documentId(mappedDocument.getDocumentId())
                            .issuerCode(mappedDocument.getIssuerCode())
                            .entityCode(mappedDocument.getEntityCode())
                            .status("RECEIVED")
                            .build());
                } else if (isIndexedDocumentChanged(existingDocument, mappedDocument)) {
                    toSave.add(mappedDocument);
                } else {
                    unchangedIds.add(mappedDocument.getDocumentId());
                }
            }
        } catch (IOException e) {
            throw new StorageException("Erreur lors de la lecture du répertoire " + typePath, e);
        }

        if (!receiveLogs.isEmpty()) {
            auditLogRepository.saveAll(receiveLogs);
        }
        if (!toSave.isEmpty()) {
            documentRepository.saveAll(toSave);
        }
        batchMarkAsSeen(unchangedIds, syncStartTime);

        List<Document> missingDocs = existingDocs.stream()
                .filter(doc -> !currentIds.contains(doc.getDocumentId()))
                .toList();
        if (!missingDocs.isEmpty()) {
            documentRepository.deleteAllInBatch(missingDocs);
        }
    }

    private Instant resolveScanBaseline() {
        if (!Instant.EPOCH.equals(lastScanTimestamp)) {
            return lastScanTimestamp;
        }
        Instant persistedBaseline = documentRepository.findLatestActivityTimestamp();
        return persistedBaseline != null ? persistedBaseline : Instant.EPOCH;
    }

    private Set<String> resolveExistingCandidateIds(List<Document> candidates) {
        if (candidates.isEmpty()) {
            return Collections.emptySet();
        }

        Set<String> existingIds = new HashSet<>();
        int batchSize = 500;
        List<String> candidateIds = candidates.stream()
                .map(Document::getDocumentId)
                .toList();

        for (int i = 0; i < candidateIds.size(); i += batchSize) {
            List<String> batch = candidateIds.subList(i, Math.min(i + batchSize, candidateIds.size()));
            existingIds.addAll(documentRepository.findExistingIds(batch));
        }
        return existingIds;
    }

    private DocumentType parseDocumentType(String typeName) {
        try {
            return DocumentType.valueOf(typeName);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String buildDocumentId(String issuer, String entity, String filename) {
        int lastDot = filename.lastIndexOf('.');
        String baseName = lastDot > 0 ? filename.substring(0, lastDot) : filename;
        return issuer + "_" + entity + "_" + baseName;
    }

    private boolean isIndexedDocumentChanged(Document existingDocument, Document mappedDocument) {
        return !Objects.equals(existingDocument.getType(), mappedDocument.getType())
                || !Objects.equals(existingDocument.getClientType(), mappedDocument.getClientType())
                || !Objects.equals(existingDocument.getEntityCode(), mappedDocument.getEntityCode())
                || !Objects.equals(existingDocument.getIssuerCode(), mappedDocument.getIssuerCode())
                || !Objects.equals(existingDocument.getPeriod(), mappedDocument.getPeriod())
                || !Objects.equals(existingDocument.getStatus(), mappedDocument.getStatus())
                || !Objects.equals(existingDocument.getHash(), mappedDocument.getHash())
                || !Objects.equals(existingDocument.getCreatedAt(), mappedDocument.getCreatedAt())
                || !Objects.equals(existingDocument.getFileSize(), mappedDocument.getFileSize())
                || !Objects.equals(existingDocument.getOriginalFilename(), mappedDocument.getOriginalFilename());
    }

    private void batchMarkAsSeen(List<String> documentIds, Instant syncStartTime) {
        if (documentIds.isEmpty()) {
            return;
        }
        int batchSize = 500;
        for (int i = 0; i < documentIds.size(); i += batchSize) {
            List<String> batch = documentIds.subList(i, Math.min(i + batchSize, documentIds.size()));
            documentRepository.markAsSeen(batch, syncStartTime);
        }
    }

    private Path getStorageRootPath() {
        return Paths.get(storageRoot).toAbsolutePath().normalize();
    }

    private Path findFileOnDisk(String documentId) throws IOException {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document " + documentId + " introuvable en base"));

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

    public List<AuditLog> getAuditLogs(String issuerCode, String entityCode) {
        if (issuerCode == null && entityCode == null) {
            return auditLogRepository.findAllByOrderByTimestampDesc();
        }
        if (issuerCode != null && entityCode != null) {
            return auditLogRepository.findByIssuerCodeAndEntityCodeOrderByTimestampDesc(issuerCode, entityCode);
        }
        if (issuerCode != null) {
            return auditLogRepository.findByIssuerCodeOrderByTimestampDesc(issuerCode);
        }
        return auditLogRepository.findAllWithFilters(null, entityCode, null, null, null);
    }

    public PaginatedResponse<AuditLog> searchAuditLogs(String issuerCode, String entityCode, String user, String action, String resource, Long cursor, int limit) {
        List<AuditLog> logs = auditLogRepository.findWithFilters(
                issuerCode,
                entityCode,
                normalizeSearch(user),
                normalizeSearch(action),
                normalizeSearch(resource),
                cursor,
                PageRequest.of(0, limit + 1));
        long totalCount = auditLogRepository.countWithFilters(
                issuerCode,
                entityCode,
                normalizeSearch(user),
                normalizeSearch(action),
                normalizeSearch(resource));

        boolean hasMore = logs.size() > limit;
        List<AuditLog> items = hasMore ? logs.subList(0, limit) : logs;
        String nextCursor = hasMore ? String.valueOf(items.get(items.size() - 1).getId()) : null;
        return new PaginatedResponse<>(items, nextCursor, hasMore, totalCount);
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
                .entityCode(entityCode)
                .status("CSV")
                .build());

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] exportAuditCsv(String issuerCode, String entityCode, String user, String action, String resource) {
        List<AuditLog> logs = auditLogRepository.findAllWithFilters(
                issuerCode,
                entityCode,
                normalizeSearch(user),
                normalizeSearch(action),
                normalizeSearch(resource));
        StringBuilder csv = new StringBuilder("timestamp,user,action,resource,documentId,issuerCode,entityCode,status\n");
        for (AuditLog log : logs) {
            csv.append(csv(log.getTimestamp())).append(',')
                    .append(csv(log.getUser())).append(',')
                    .append(csv(log.getAction())).append(',')
                    .append(csv(log.getResource())).append(',')
                    .append(csv(log.getDocumentId())).append(',')
                    .append(csv(log.getIssuerCode())).append(',')
                    .append(csv(log.getEntityCode())).append(',')
                    .append(csv(log.getStatus()))
                    .append('\n');
        }

        auditLogRepository.save(AuditLog.builder()
                .user(getCurrentUsername())
                .action("EXPORT_AUDIT")
                .resource("AUDIT_LOG")
                .issuerCode(issuerCode)
                .entityCode(entityCode)
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
        if (trimmed.isEmpty()) {
            return null;
        }

        String basename = trimmed
                .replace('\\', '/')
                .replaceAll("^.*/", "");

        String normalized = basename.replaceAll("(?i)\\.(ALIRE|AR0|AR1|AR2|AR3|AR4)$", "");
        return normalized.isEmpty() ? basename : normalized;
    }

    private ClientType inferClientType(String stableKey) {
        ClientType[] values = ClientType.values();
        return values[Math.floorMod(stableKey.hashCode(), values.length)];
    }

    private String getCurrentUsername() {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            return "system";
        }
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

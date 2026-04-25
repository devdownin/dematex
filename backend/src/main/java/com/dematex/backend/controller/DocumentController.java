package com.dematex.backend.controller;

import com.dematex.backend.config.SecurityUtils;
import com.dematex.backend.dto.*;
import com.dematex.backend.exception.BusinessException;
import com.dematex.backend.model.*;
import com.dematex.backend.service.DocumentService;
import com.dematex.backend.service.SignedDownloadService;
import com.dematex.backend.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Documents", description = "Gestion du catalogue de documents et téléchargements")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final SignedDownloadService signedDownloadService;
    private final SecurityUtils securityUtils;
    private final StorageService storageService;

    @Operation(summary = "Liste paginée des documents", description = "Récupère les documents d'une entité avec filtrage par type, période, statut et pagination cursor-based")
    @GetMapping("/entities/{entityCode}/documents")
    public PaginatedResponse<DocumentDTO> getDocuments(
            @PathVariable String entityCode,
            @RequestParam(required = false) String issuerCode,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(required = false) DocumentType type,
            @RequestParam(required = false) ClientType clientType,
            @RequestParam(required = false) String periodStart,
            @RequestParam(required = false) String periodEnd,
            @RequestParam(required = false) AcknowledgementType status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean lateOnly) {
        
        if (!"ALL".equals(entityCode)) {
            securityUtils.checkEntityAccess(entityCode);
        }
        
        if (issuerCode != null) {
            securityUtils.checkIssuerAccess(issuerCode);
        }
        
        User currentUser = securityUtils.getCurrentUser();
        String effectiveEntity = entityCode;
        if ("ALL".equals(entityCode) || currentUser.getLegalEntityCode() == null) {
            if (currentUser.getLegalEntityCode() != null) {
                effectiveEntity = currentUser.getLegalEntityCode();
            } else {
                effectiveEntity = "ALL".equals(entityCode) ? null : entityCode;
            }
        }

        String effectiveIssuer = issuerCode != null ? issuerCode : securityUtils.getEffectiveIssuer();

        return documentService.getDocuments(effectiveEntity, effectiveIssuer, type, clientType, periodStart, periodEnd, status, cursor, q, lateOnly, limit);
    }

    @Operation(summary = "Recherche plein texte", description = "Recherche des documents sur documentId, entityCode, issuerCode et period")
    @GetMapping("/search")
    public PaginatedResponse<DocumentDTO> searchDocuments(@RequestParam String q, @RequestParam(required = false) String entityCode, @RequestParam(required = false) String issuerCode, @RequestParam(required = false) String cursor, @RequestParam(defaultValue = "100") int limit, @RequestParam(required = false) DocumentType type, @RequestParam(required = false) ClientType clientType, @RequestParam(required = false) String periodStart, @RequestParam(required = false) String periodEnd, @RequestParam(required = false) AcknowledgementType status, @RequestParam(required = false) Boolean lateOnly) {
        User currentUser = securityUtils.getCurrentUser();
        String effectiveEntity = entityCode;
        if (currentUser.getLegalEntityCode() != null) {
            effectiveEntity = currentUser.getLegalEntityCode();
        }
        
        String effectiveIssuer = issuerCode != null ? issuerCode : securityUtils.getEffectiveIssuer();
        if (issuerCode != null) {
            securityUtils.checkIssuerAccess(issuerCode);
        }

        return documentService.getDocuments(effectiveEntity, effectiveIssuer, type, clientType, periodStart, periodEnd, status, cursor, q, lateOnly, limit);
    }

    @Operation(summary = "Détail d'un document", description = "Récupère les métadonnées complètes d'un document par son ID")
    @GetMapping("/documents/{documentId}")
    public DocumentDTO getDocument(@PathVariable String documentId) {
        DocumentDTO doc = documentService.getDocumentOrThrow(documentId);
        securityUtils.checkDocumentAccess(doc.getIssuerCode(), doc.getEntityCode());
        return doc;
    }

    @Operation(summary = "Statistiques du tableau de bord", description = "Retourne les compteurs globaux : total, AR3, en retard, taux de complétion")
    @GetMapping("/stats")
    public DashboardStats getStats() { return documentService.getStats(securityUtils.getEffectiveIssuer()); }

    @GetMapping("/stats/latency-trends")
    public List<Map<String, Object>> getLatencyTrends(@RequestParam(defaultValue = "daily") String granularity) {
        return documentService.getLatencyTrends(granularity, securityUtils.getEffectiveIssuer());
    }

    @GetMapping("/documents/{documentId}/download-link")
    public SignedDownloadLinkDTO getSignedDownloadLink(@PathVariable String documentId) {
        DocumentDTO doc = documentService.getDocumentOrThrow(documentId);
        securityUtils.checkDocumentAccess(doc.getIssuerCode(), doc.getEntityCode());

        Instant expiresAt = signedDownloadService.computeExpiry();
        String signature = signedDownloadService.sign(documentId, expiresAt);
        String url = "/api/v1/documents/" + documentId + "/content?expiresAt=" + expiresAt.getEpochSecond() + "&signature=" + signature;
        return new SignedDownloadLinkDTO(url, expiresAt);
    }

    @Operation(summary = "Télécharger le contenu d'un document",
        description = "Téléchargement direct authentifié par Bearer token (usage ETL). " +
                      "Paramètres expiresAt+signature optionnels pour compatibilité portail (URL signée). " +
                      "HEAD supporté pour vérification existence/ETag sans transfert.")
    @RequestMapping(value = "/documents/{documentId}/content",
        method = {RequestMethod.GET, RequestMethod.HEAD})
    public ResponseEntity<Resource> getContent(
            @PathVariable String documentId,
            @RequestParam(required = false) Long expiresAt,
            @RequestParam(required = false) String signature) {

        if (expiresAt != null && signature != null) {
            if (!signedDownloadService.isValid(documentId, expiresAt, signature)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        DocumentDTO doc = documentService.getDocumentOrThrow(documentId);
        securityUtils.checkDocumentAccess(doc.getIssuerCode(), doc.getEntityCode());

        Resource resource = documentService.getFileAsResource(documentId);
        documentService.recordDocumentDownload(documentId);

        String filename = doc.getDocumentId();
        String etag = doc.getHash() != null ? "\"" + doc.getHash() + "\"" : null;

        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM);
        if (etag != null) {
            builder = builder.header(HttpHeaders.ETAG, etag);
        }
        try {
            long contentLength = resource.contentLength();
            if (contentLength >= 0) builder = builder.contentLength(contentLength);
        } catch (Exception ignored) {}

        return builder.body(resource);
    }

    @Operation(summary = "Exporter les documents en CSV", description = "Exporte la liste filtrée des documents au format CSV")
    @GetMapping("/entities/{entityCode}/documents/export")
    public ResponseEntity<Resource> exportDocuments(
            @PathVariable String entityCode,
            @RequestParam(required = false) String issuerCode,
            @RequestParam(required = false) DocumentType type,
            @RequestParam(required = false) ClientType clientType,
            @RequestParam(required = false) String periodStart,
            @RequestParam(required = false) String periodEnd,
            @RequestParam(required = false) AcknowledgementType status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean lateOnly) {
        
        if (issuerCode != null) {
            securityUtils.checkIssuerAccess(issuerCode);
        }

        User currentUser = securityUtils.getCurrentUser();
        String effectiveEntity = entityCode;
        if ("ALL".equals(entityCode)) {
            effectiveEntity = currentUser.getLegalEntityCode();
        } else {
            securityUtils.checkEntityAccess(entityCode);
        }

        String effectiveIssuer = issuerCode != null ? issuerCode : securityUtils.getEffectiveIssuer();

        byte[] content = documentService.exportDocumentsCsv(effectiveEntity, effectiveIssuer, type, clientType, periodStart, periodEnd, status, q, lateOnly);
        Resource resource = new ByteArrayResource(content);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"documents-export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .contentLength(content.length)
                .body(resource);
    }

    @Operation(summary = "Enregistrer un accusé de réception", description = "Ajoute un AR (AR1, AR2, AR3) à un document et met à jour le fichier physique")
    @PostMapping("/entities/{entityCode}/documents/{documentId}/acknowledgements")
    public void addAcknowledgement(@PathVariable String entityCode, @PathVariable String documentId, @RequestBody AcknowledgementRequest request) {
        DocumentDTO doc = documentService.getDocumentOrThrow(documentId);
        securityUtils.checkDocumentAccess(doc.getIssuerCode(), doc.getEntityCode());
        if (!doc.getEntityCode().equals(entityCode)) {
            throw new BusinessException("Le document " + documentId + " n'appartient pas à l'entité " + entityCode);
        }
        documentService.addAcknowledgement(doc.getEntityCode(), documentId, request.getType(), request.getDetails());
    }

    @GetMapping("/documents/{documentId}/acknowledgements")
    public List<Acknowledgement> getAcknowledgements(@PathVariable String documentId) {
        DocumentDTO doc = documentService.getDocumentOrThrow(documentId);
        securityUtils.checkDocumentAccess(doc.getIssuerCode(), doc.getEntityCode());

        return documentService.getAcknowledgements(documentId);
    }

    @Operation(summary = "Accusé de réception idempotent (ETL)",
        description = "Enregistre un AR de façon idempotente via Idempotency-Key. " +
                      "Un second appel avec la même clé renvoie le résultat original sans effet de bord. " +
                      "Valide la machine à états : AR0→AR2/AR3/AR4, AR2→AR3/AR4, AR3/AR4 terminaux.")
    @PutMapping("/documents/{documentId}/acknowledgement")
    public ResponseEntity<AcknowledgementResultDTO> putAcknowledgement(
            @PathVariable String documentId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody AcknowledgementPutRequest request) {

        DocumentDTO doc = documentService.getDocumentOrThrow(documentId);
        securityUtils.checkDocumentAccess(doc.getIssuerCode(), doc.getEntityCode());

        AcknowledgementResultDTO result = documentService.addAcknowledgementIdempotent(
                doc.getEntityCode(), documentId,
                request.getAckType(), idempotencyKey,
                request.getExternalReference(), request.getAckTimestamp(), request.getComment());

        HttpStatus status = result.isAlreadyApplied() ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(status).body(result);
    }

    @Operation(summary = "Accusés de réception en lot (ETL)",
        description = "Enregistre jusqu'à 200 AR en une seule requête. " +
                      "Réponse 207 Multi-Status avec un résultat par item (OK, ALREADY_APPLIED ou ERROR). " +
                      "Chaque item est traité indépendamment — un échec n'annule pas les autres.")
    @PostMapping("/acknowledgements/batch")
    @ResponseStatus(HttpStatus.MULTI_STATUS)
    public BatchAcknowledgementResult batchAcknowledge(@RequestBody BatchAcknowledgementRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BusinessException("La liste d'items ne peut pas être vide");
        }

        return documentService.addAcknowledgementsBatch(request);
    }

    @GetMapping("/audit")
    public PaginatedResponse<AuditLog> getAuditLogs(
            @RequestParam(required = false) String user,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String resource,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "100") int limit) {
        User currentUser = securityUtils.getCurrentUser();
        Long cursorId = (cursor != null) ? Long.parseLong(cursor) : null;
        return documentService.searchAuditLogs(
                currentUser.getAllowedIssuer(),
                currentUser.getLegalEntityCode(),
                user, action, resource, cursorId, limit);
    }

    @GetMapping("/audit/export")
    public ResponseEntity<Resource> exportAuditLogs(
            @RequestParam(required = false) String user,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String resource) {
        User currentUser = securityUtils.getCurrentUser();
        byte[] content = documentService.exportAuditCsv(
                currentUser.getAllowedIssuer(),
                currentUser.getLegalEntityCode(),
                user, action, resource);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit-export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(new ByteArrayResource(content));
    }

    @PostMapping("/documents/upload")
    public Map<String, String> uploadDocument(
            @RequestParam("destinataire") String destinataire,
            @RequestParam("entity") String entity,
            @RequestParam("type") String type,
            @RequestParam("statut") String statut,
            @RequestParam("file") MultipartFile file) {
        securityUtils.checkVautAccess();
        String path = storageService.uploadFile(destinataire, entity, type, statut, file);
        return Map.of("status", "uploaded", "path", path);
    }

    @Data
    public static class AcknowledgementRequest {
        private AcknowledgementType type;
        private String details;
    }

}

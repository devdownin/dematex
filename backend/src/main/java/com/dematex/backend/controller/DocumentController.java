package com.dematex.backend.controller;

import com.dematex.backend.dto.*;
import com.dematex.backend.model.*;
import com.dematex.backend.service.DocumentService;
import com.dematex.backend.service.EventService;
import com.dematex.backend.service.SignedDownloadService;
import com.dematex.backend.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
@Tag(name = "Documents", description = "API de gestion des documents réglementaires et accusés de réception")
public class DocumentController {
    private final DocumentService documentService;
    private final EventService eventService;
    private final SignedDownloadService signedDownloadService;
    private final StorageService storageService;

    private void checkEntityAccess(String entityCode) {
        User user = getCurrentUser();
        if (user.getLegalEntityCode() != null && !user.getLegalEntityCode().equals(entityCode)) {
            throw new org.springframework.security.access.AccessDeniedException("Accès refusé à l'entité " + entityCode);
        }
    }

    private void checkIssuerAccess(String issuerCode) {
        User user = getCurrentUser();
        if (user.getAllowedIssuer() != null && !user.getAllowedIssuer().equals(issuerCode)) {
            throw new org.springframework.security.access.AccessDeniedException("Accès refusé à l'émetteur " + issuerCode);
        }
    }

    /** Returns the issuer restriction for the current user, or null if admin. */
    private String getEffectiveIssuer() {
        return getCurrentUser().getAllowedIssuer();
    }

    private User getCurrentUser() {
        Object principal = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }
        throw new org.springframework.security.access.AccessDeniedException("Utilisateur non authentifié");
    }

    @Operation(summary = "Liste paginée des documents", description = "Récupère les documents d'une entité avec filtrage par type, période, statut et pagination cursor-based")
    @GetMapping("/entities/{entityCode}/documents")
    public PaginatedResponse<DocumentDTO> getDocuments(@PathVariable String entityCode, @RequestParam(required = false) String cursor, @RequestParam(defaultValue = "100") int limit, @RequestParam(required = false) DocumentType type, @RequestParam(required = false) ClientType clientType, @RequestParam(required = false) String periodStart, @RequestParam(required = false) String periodEnd, @RequestParam(required = false) AcknowledgementType status, @RequestParam(required = false) String q, @RequestParam(required = false) Boolean lateOnly) {
        checkEntityAccess(entityCode);
        return documentService.getDocuments(entityCode, getEffectiveIssuer(), type, clientType, periodStart, periodEnd, status, cursor, q, lateOnly, limit);
    }

    @Operation(summary = "Recherche plein texte", description = "Recherche des documents sur documentId, entityCode, issuerCode et period")
    @GetMapping("/search")
    public PaginatedResponse<DocumentDTO> searchDocuments(@RequestParam String q, @RequestParam(required = false) String entityCode, @RequestParam(required = false) String cursor, @RequestParam(defaultValue = "100") int limit, @RequestParam(required = false) DocumentType type, @RequestParam(required = false) ClientType clientType, @RequestParam(required = false) String periodStart, @RequestParam(required = false) String periodEnd, @RequestParam(required = false) AcknowledgementType status, @RequestParam(required = false) Boolean lateOnly) {
        User currentUser = getCurrentUser();
        String effectiveEntity = entityCode;
        if (currentUser.getLegalEntityCode() != null) {
            effectiveEntity = currentUser.getLegalEntityCode();
        }

        return documentService.getDocuments(effectiveEntity, getEffectiveIssuer(), type, clientType, periodStart, periodEnd, status, cursor, q, lateOnly, limit);
    }

    @Operation(summary = "Détail d'un document", description = "Récupère les métadonnées complètes d'un document par son ID")
    @GetMapping("/documents/{documentId}")
    public ResponseEntity<DocumentDTO> getDocument(@PathVariable String documentId) {
        Optional<DocumentDTO> doc = documentService.getDocument(documentId);
        if (doc.isPresent()) {
            checkEntityAccess(doc.get().getEntityCode());
            checkIssuerAccess(doc.get().getIssuerCode());
            return ResponseEntity.ok(doc.get());
        }
        return ResponseEntity.notFound().build();
    }

    @Operation(summary = "Statistiques du tableau de bord", description = "Retourne les compteurs globaux : total, AR3, en retard, taux de complétion")
    @GetMapping("/stats")
    public DashboardStats getStats() { return documentService.getStats(getEffectiveIssuer()); }

    @GetMapping("/stats/latency-trends")
    public List<java.util.Map<String, Object>> getLatencyTrends(@RequestParam(defaultValue = "daily") String granularity) {
        return documentService.getLatencyTrends(granularity, getEffectiveIssuer());
    }

    @GetMapping("/documents/{documentId}/download-link")
    public SignedDownloadLinkDTO getSignedDownloadLink(@PathVariable String documentId) {
        Instant expiresAt = signedDownloadService.computeExpiry();
        String signature = signedDownloadService.sign(documentId, expiresAt);
        String url = "/api/v1/documents/" + documentId + "/content?expiresAt=" + expiresAt.getEpochSecond() + "&signature=" + signature;
        return new SignedDownloadLinkDTO(url, expiresAt);
    }

    @GetMapping("/documents/{documentId}/content")
    public ResponseEntity<Resource> getContent(@PathVariable String documentId, @RequestParam long expiresAt, @RequestParam String signature) {
        if (!signedDownloadService.isValid(documentId, expiresAt, signature)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            byte[] content = documentService.getFileContent(documentId);
            documentService.recordDocumentDownload(documentId);
            Resource resource = new ByteArrayResource(content);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + documentId + ".bin\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(content.length)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Exporter les documents en CSV", description = "Exporte la liste filtrée des documents au format CSV")
    @GetMapping("/entities/{entityCode}/documents/export")
    public ResponseEntity<Resource> exportDocuments(@PathVariable String entityCode, @RequestParam(required = false) DocumentType type, @RequestParam(required = false) ClientType clientType, @RequestParam(required = false) String periodStart, @RequestParam(required = false) String periodEnd, @RequestParam(required = false) AcknowledgementType status, @RequestParam(required = false) String q, @RequestParam(required = false) Boolean lateOnly) {
        checkEntityAccess(entityCode);
        byte[] content = documentService.exportDocumentsCsv(entityCode, getEffectiveIssuer(), type, clientType, periodStart, periodEnd, status, q, lateOnly);
        Resource resource = new ByteArrayResource(content);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"documents-export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .contentLength(content.length)
                .body(resource);
    }

    @Operation(summary = "Enregistrer un accusé de réception", description = "Ajoute un AR (AR1, AR2, AR3) à un document et met à jour le fichier physique")
    @PostMapping("/entities/{entityCode}/documents/{documentId}/acknowledgements")
    public ResponseEntity<Void> addAcknowledgement(@PathVariable String entityCode, @PathVariable String documentId, @RequestBody AcknowledgementRequest request) {
        try {
            documentService.addAcknowledgement(entityCode, documentId, request.getType(), request.getDetails());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/documents/{documentId}/acknowledgements")
    public List<Acknowledgement> getAcknowledgements(@PathVariable String documentId) {
        return documentService.getAcknowledgements(documentId);
    }

    @Operation(summary = "Journal d'audit", description = "Retourne l'historique complet des actions (accusés de réception, modifications)")
    @GetMapping("/audit")
    public List<AuditLog> getAuditLogs() {
        return documentService.getAuditLogs();
    }

    @Operation(summary = "Exporter le journal d'audit", description = "Exporte le journal d'audit au format CSV")
    @GetMapping("/audit/export")
    public ResponseEntity<Resource> exportAuditLogs() {
        byte[] content = documentService.exportAuditCsv();
        Resource resource = new ByteArrayResource(content);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit-export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .contentLength(content.length)
                .body(resource);
    }

    @Operation(summary = "Flux d'événements temps réel (SSE)", description = "Ouvre une connexion Server-Sent Events pour recevoir les mises à jour en direct")
    @GetMapping("/events")
    public SseEmitter streamEvents() {
        return eventService.addEmitter();
    }

    @Operation(summary = "Déposer un fichier", description = "Upload un fichier dans l'arborescence. Le destinataire définit le répertoire racine, le type le sous-répertoire, et le statut l'extension du fichier (.ALIRE, .AR3, etc.)")
    @PostMapping(value = "/documents/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadDocument(
            @Parameter(description = "Destinataire (répertoire racine, ex: REC_001)") @RequestParam String destinataire,
            @Parameter(description = "Code entité (ex: ENT_ALPHA)") @RequestParam String entity,
            @Parameter(description = "Type de document (FTIS, VTIS, PTIS, CRMENS — Montant des transactions validées sur un mois)") @RequestParam String type,
            @Parameter(description = "Statut / extension du fichier (ex: ALIRE, AR3)") @RequestParam String statut,
            @RequestParam("file") MultipartFile file) {
        try {
            String path = storageService.uploadFile(destinataire, entity, type, statut, file);
            return ResponseEntity.ok(Map.of("path", path, "status", "uploaded"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @lombok.Data public static class AcknowledgementRequest { private AcknowledgementType type; private String details; }
}

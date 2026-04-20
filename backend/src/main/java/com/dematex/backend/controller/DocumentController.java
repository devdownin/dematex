package com.dematex.backend.controller;

import com.dematex.backend.dto.*;
import com.dematex.backend.model.*;
import com.dematex.backend.service.DocumentService;
import com.dematex.backend.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
@Tag(name = "Documents", description = "API de gestion des documents réglementaires et accusés de réception")
public class DocumentController {
    private final DocumentService documentService;
    private final EventService eventService;

    @Operation(summary = "Liste paginée des documents", description = "Récupère les documents d'une entité avec filtrage par type, période, statut et pagination cursor-based")
    @GetMapping("/entities/{entityCode}/documents")
    public PaginatedResponse<DocumentDTO> getDocuments(@PathVariable String entityCode, @RequestParam(required = false) String cursor, @RequestParam(defaultValue = "100") int limit, @RequestParam(required = false) DocumentType type, @RequestParam(required = false) String periodStart, @RequestParam(required = false) String periodEnd, @RequestParam(required = false) AcknowledgementType status, @RequestParam(required = false) Boolean lateOnly) {
        return documentService.getDocuments(entityCode, type, periodStart, periodEnd, status, cursor, lateOnly, limit);
    }

    @Operation(summary = "Détail d'un document", description = "Récupère les métadonnées complètes d'un document par son ID")
    @GetMapping("/documents/{documentId}")
    public ResponseEntity<DocumentDTO> getDocument(@PathVariable String documentId) {
        return documentService.getDocument(documentId).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Statistiques du tableau de bord", description = "Retourne les compteurs globaux : total, AR3, en retard, taux de complétion")
    @GetMapping("/stats")
    public DashboardStats getStats() { return documentService.getStats(); }

    @GetMapping("/stats/latency-trends")
    public List<java.util.Map<String, Object>> getLatencyTrends() {
        return documentService.getLatencyTrends();
    }

    @GetMapping("/documents/{documentId}/content")
    public ResponseEntity<Resource> getContent(@PathVariable String documentId) {
        try {
            byte[] content = documentService.getFileContent(documentId);
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

    @Operation(summary = "Flux d'événements temps réel (SSE)", description = "Ouvre une connexion Server-Sent Events pour recevoir les mises à jour en direct")
    @GetMapping("/events")
    public SseEmitter streamEvents() {
        return eventService.addEmitter();
    }

    @lombok.Data public static class AcknowledgementRequest { private AcknowledgementType type; private String details; }
}

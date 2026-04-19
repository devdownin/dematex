package com.dematex.backend.controller;

import com.dematex.backend.dto.*;
import com.dematex.backend.model.*;
import com.dematex.backend.service.DocumentService;
import com.dematex.backend.service.EventService;
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
public class DocumentController {
    private final DocumentService documentService;
    private final EventService eventService;

    @GetMapping("/entities/{entityCode}/documents")
    public PaginatedResponse<DocumentDTO> getDocuments(@PathVariable String entityCode, @RequestParam(required = false) String cursor, @RequestParam(defaultValue = "100") int limit, @RequestParam(required = false) DocumentType type, @RequestParam(required = false) String periodStart, @RequestParam(required = false) String periodEnd, @RequestParam(required = false) AcknowledgementType status, @RequestParam(required = false) Boolean lateOnly) {
        return documentService.getDocuments(entityCode, type, periodStart, periodEnd, status, cursor, lateOnly, limit);
    }

    @GetMapping("/documents/{documentId}")
    public ResponseEntity<DocumentDTO> getDocument(@PathVariable String documentId) {
        return documentService.getDocument(documentId).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

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

    @GetMapping("/audit")
    public List<AuditLog> getAuditLogs() {
        return documentService.getAuditLogs();
    }

    @GetMapping("/events")
    public SseEmitter streamEvents() {
        return eventService.addEmitter();
    }

    @lombok.Data public static class AcknowledgementRequest { private AcknowledgementType type; private String details; }
}

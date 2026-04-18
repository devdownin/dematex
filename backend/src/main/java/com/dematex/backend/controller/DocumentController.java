package com.dematex.backend.controller;

import com.dematex.backend.dto.*;
import com.dematex.backend.model.*;
import com.dematex.backend.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class DocumentController {
    private final DocumentService documentService;

    @GetMapping("/entities/{entityCode}/documents")
    public PaginatedResponse<DocumentDTO> getDocuments(@PathVariable String entityCode, @RequestParam(required = false) String cursor, @RequestParam(defaultValue = "100") int limit, @RequestParam(required = false) DocumentType type, @RequestParam(required = false) String periodStart, @RequestParam(required = false) String periodEnd, @RequestParam(required = false) AcknowledgementType status) {
        return documentService.getDocuments(entityCode, type, periodStart, periodEnd, status, cursor, limit);
    }

    @GetMapping("/documents/delta")
    public PaginatedResponse<DocumentDTO> getDelta(@RequestParam Instant lastUpdate, @RequestParam(defaultValue = "100") int limit) {
        return documentService.getDelta(lastUpdate, limit);
    }

    @GetMapping("/documents/{documentId}")
    public ResponseEntity<DocumentDTO> getDocument(@PathVariable String documentId) {
        return documentService.getDocument(documentId).map(doc -> ResponseEntity.ok(documentService.convertToDTO(doc))).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/stats")
    public DashboardStats getStats() { return documentService.getStats(); }

    @GetMapping("/documents/{documentId}/content")
    public ResponseEntity<Resource> getContent(@PathVariable String documentId) {
        return documentService.getDocument(documentId).<ResponseEntity<Resource>>map(doc -> {
            Resource resource = new ByteArrayResource(doc.getContent());
            return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + documentId + ".bin\"").contentType(MediaType.APPLICATION_OCTET_STREAM).contentLength(doc.getContent().length).body(resource);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/entities/{entityCode}/documents/{documentId}/acknowledgements")
    public ResponseEntity<Void> addAcknowledgement(@PathVariable String entityCode, @PathVariable String documentId, @RequestBody AcknowledgementRequest request) {
        documentService.addAcknowledgement(entityCode, documentId, request.getType(), request.getDetails());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/documents/{documentId}/acknowledgements")
    public List<Acknowledgement> getAcknowledgements(@PathVariable String documentId) {
        return documentService.getAcknowledgements(documentId);
    }

    @lombok.Data public static class AcknowledgementRequest { private AcknowledgementType type; private String details; }
}

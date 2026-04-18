package com.dematex.backend.service;

import com.dematex.backend.dto.*;
import com.dematex.backend.model.*;
import com.dematex.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final AcknowledgementRepository acknowledgementRepository;

    public PaginatedResponse<DocumentDTO> getDocuments(String entityCode, DocumentType type, String periodStart, String periodEnd, AcknowledgementType status, String cursor, int limit) {
        List<Document> documents = documentRepository.findDocumentsWithFilters(entityCode, type, periodStart, periodEnd, status, cursor, PageRequest.of(0, limit + 1));
        boolean hasMore = documents.size() > limit;
        List<Document> resultList = hasMore ? documents.subList(0, limit) : documents;
        String nextCursor = resultList.isEmpty() ? null : resultList.get(resultList.size() - 1).getDocumentId();
        List<DocumentDTO> dtos = resultList.stream().map(this::convertToDTO).collect(Collectors.toList());
        return new PaginatedResponse<>(dtos, hasMore ? nextCursor : null, hasMore);
    }

    public PaginatedResponse<DocumentDTO> getDelta(Instant lastUpdate, int limit) {
        List<Document> documents = documentRepository.findByUpdatedAtAfterOrderByUpdatedAtAsc(lastUpdate, PageRequest.of(0, limit + 1));
        boolean hasMore = documents.size() > limit;
        List<Document> resultList = hasMore ? documents.subList(0, limit) : documents;
        String nextCursor = resultList.isEmpty() ? null : String.valueOf(resultList.get(resultList.size() - 1).getUpdatedAt().toEpochMilli());
        List<DocumentDTO> dtos = resultList.stream().map(this::convertToDTO).collect(Collectors.toList());
        return new PaginatedResponse<>(dtos, hasMore ? nextCursor : null, hasMore);
    }

    public Optional<Document> getDocument(String documentId) { return documentRepository.findById(documentId); }

    public DashboardStats getStats() {
        long total = documentRepository.count();
        long ar3 = documentRepository.countByStatus(AcknowledgementType.AR3);
        return DashboardStats.builder()
                .totalDocuments(total)
                .ar3Completed(ar3)
                .ar3Pending(total - ar3)
                .ar3CompletionRate(total > 0 ? (double) ar3 / total * 100 : 0)
                .build();
    }

    @Transactional
    public void addAcknowledgement(String entityCode, String documentId, AcknowledgementType type, String details) {
        Document document = documentRepository.findById(documentId).orElseThrow(() -> new RuntimeException("Not found"));
        acknowledgementRepository.save(Acknowledgement.builder().documentId(documentId).entityCode(entityCode).type(type).details(details).build());
        document.setStatus(type);
        documentRepository.save(document);
    }

    public List<Acknowledgement> getAcknowledgements(String documentId) { return acknowledgementRepository.findByDocumentIdOrderByTimestampAsc(documentId); }

    public DocumentDTO convertToDTO(Document doc) {
        DocumentDTO dto = new DocumentDTO();
        dto.setDocumentId(doc.getDocumentId());
        dto.setType(doc.getType());
        dto.setEntityCode(doc.getEntityCode());
        dto.setIssuerCode(doc.getIssuerCode());
        dto.setPeriod(doc.getPeriod());
        dto.setStatus(doc.getStatus());
        dto.setCreatedAt(doc.getCreatedAt());
        dto.setUpdatedAt(doc.getUpdatedAt());
        return dto;
    }
}

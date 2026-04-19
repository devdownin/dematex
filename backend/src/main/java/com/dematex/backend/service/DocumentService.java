package com.dematex.backend.service;

import com.dematex.backend.dto.*;
import com.dematex.backend.model.*;
import com.dematex.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

@Service @RequiredArgsConstructor @Slf4j
public class DocumentService {

    private static final Duration AR3_SLA = Duration.ofDays(2);

    private final DocumentRepository documentRepository;

    @Value("${storage.root:./regulatory_files}")
    private String storageRoot;

    public PaginatedResponse<DocumentDTO> getDocuments(String entityCode, DocumentType type, String periodStart, String periodEnd, AcknowledgementType status, String cursor, Boolean lateOnly, int limit) {
        Instant lateThreshold = Instant.now().minus(AR3_SLA);
        List<Document> documents = documentRepository.findDocumentsWithFilters(
                entityCode, type, periodStart, periodEnd, status, cursor, lateOnly, lateThreshold, PageRequest.of(0, limit + 1));

        boolean hasMore = documents.size() > limit;
        List<Document> resultList = hasMore ? documents.subList(0, limit) : documents;
        String nextCursor = resultList.isEmpty() ? null : resultList.get(resultList.size() - 1).getDocumentId();

        List<DocumentDTO> dtos = resultList.stream().map(this::convertToDTO).collect(Collectors.toList());
        return new PaginatedResponse<>(dtos, hasMore ? nextCursor : null, hasMore);
    }

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

    public byte[] getFileContent(String documentId) throws IOException {
        Path filePath = findFileOnDisk(documentId);
        return Files.readAllBytes(filePath);
    }

    @Transactional
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

        log.info("Updated status for document {} to {} on disk and in index", documentId, type);
    }

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void syncFileSystemToIndex() {
        log.info("Starting filesystem sync to index...");
        List<Document> currentOnDisk = scanFileSystem();
        documentRepository.deleteAll();
        documentRepository.saveAll(currentOnDisk);
        log.info("Filesystem sync complete. Indexed {} documents.", currentOnDisk.size());
    }

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
            log.error("Error scanning filesystem", e);
        }
        return docs;
    }

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

        if (ext.equalsIgnoreCase("ALIRE")) {
            doc.setStatus(AcknowledgementType.AR0);
        } else {
            try { doc.setStatus(AcknowledgementType.valueOf(ext)); } catch (Exception e) { doc.setStatus(AcknowledgementType.AR0); }
        }

        try { doc.setCreatedAt(Files.getLastModifiedTime(filePath).toInstant()); } catch (IOException e) { doc.setCreatedAt(Instant.now()); }
        doc.setUpdatedAt(doc.getCreatedAt());
        doc.setPeriod("2024-01");
        return doc;
    }

    private Path findFileOnDisk(String documentId) throws IOException {
        return Files.walk(Paths.get(storageRoot))
                .filter(p -> p.getFileName().toString().startsWith(documentId + "."))
                .findFirst()
                .orElseThrow(() -> new IOException("Document " + documentId + " not found on disk"));
    }

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

        Instant deadline = doc.getCreatedAt().plus(AR3_SLA);
        dto.setDeadline(deadline);
        dto.setLate(doc.getStatus() != AcknowledgementType.AR3 && Instant.now().isAfter(deadline));

        return dto;
    }

    public List<Acknowledgement> getAcknowledgements(String documentId) {
        return Collections.emptyList();
    }
}

package com.dematex.backend.service;

import com.dematex.backend.dto.*;
import com.dematex.backend.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service @RequiredArgsConstructor @Slf4j
public class DocumentService {

    @Value("${storage.root:./regulatory_files}")
    private String storageRoot;

    public PaginatedResponse<DocumentDTO> getDocuments(String entityCode, DocumentType type, String periodStart, String periodEnd, AcknowledgementType status, String cursor, int limit) {
        List<DocumentDTO> allDocs = scanFileSystem();

        List<DocumentDTO> filtered = allDocs.stream()
                .filter(d -> entityCode == null || d.getEntityCode().equals(entityCode))
                .filter(d -> type == null || d.getType() == type)
                .filter(d -> status == null || d.getStatus() == status)
                .sorted(Comparator.comparing(DocumentDTO::getDocumentId))
                .collect(Collectors.toList());

        int startIndex = 0;
        if (cursor != null) {
            for (int i = 0; i < filtered.size(); i++) {
                if (filtered.get(i).getDocumentId().compareTo(cursor) > 0) {
                    startIndex = i;
                    break;
                }
            }
        }

        int toIndex = Math.min(startIndex + limit, filtered.size());
        List<DocumentDTO> page = filtered.subList(startIndex, toIndex);
        boolean hasMore = toIndex < filtered.size();
        String nextCursor = page.isEmpty() ? null : page.get(page.size() - 1).getDocumentId();

        return new PaginatedResponse<>(page, hasMore ? nextCursor : null, hasMore);
    }

    public DashboardStats getStats() {
        List<DocumentDTO> allDocs = scanFileSystem();
        long total = allDocs.size();
        long ar3 = allDocs.stream().filter(d -> d.getStatus() == AcknowledgementType.AR3).count();
        return DashboardStats.builder()
                .totalDocuments(total)
                .ar3Completed(ar3)
                .ar3Pending(total - ar3)
                .ar3CompletionRate(total > 0 ? (double) ar3 / total * 100 : 0)
                .build();
    }

    public Optional<DocumentDTO> getDocument(String documentId) {
        return scanFileSystem().stream().filter(d -> d.getDocumentId().equals(documentId)).findFirst();
    }

    public byte[] getFileContent(String documentId) throws IOException {
        Path filePath = findFile(documentId);
        return Files.readAllBytes(filePath);
    }

    public void addAcknowledgement(String entityCode, String documentId, AcknowledgementType type, String details) throws IOException {
        Path currentPath = findFile(documentId);
        String filename = currentPath.getFileName().toString();
        String baseName = filename.substring(0, filename.lastIndexOf('.'));
        String newExtension = "." + type.name();

        Path newPath = currentPath.resolveSibling(baseName + newExtension);
        Files.move(currentPath, newPath, StandardCopyOption.REPLACE_EXISTING);
        log.info("Updated status for document {} to {} by renaming file to {}", documentId, type, newPath);
    }

    private List<DocumentDTO> scanFileSystem() {
        List<DocumentDTO> docs = new ArrayList<>();
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
                                        docs.add(mapFileToDTO(recipient, entity, typeStr, filePath));
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

    private DocumentDTO mapFileToDTO(String recipient, String entity, String typeStr, Path filePath) {
        String filename = filePath.getFileName().toString();
        int lastDot = filename.lastIndexOf('.');
        String docId = filename.substring(0, lastDot);
        String ext = filename.substring(lastDot + 1);

        DocumentDTO dto = new DocumentDTO();
        dto.setDocumentId(docId);
        dto.setEntityCode(entity);
        dto.setIssuerCode(recipient);
        try {
            dto.setType(DocumentType.valueOf(typeStr));
        } catch (Exception e) {
            dto.setType(DocumentType.REFERENTIEL);
        }

        if (ext.equalsIgnoreCase("ALIRE")) {
            dto.setStatus(AcknowledgementType.AR0);
        } else {
            try {
                dto.setStatus(AcknowledgementType.valueOf(ext));
            } catch (Exception e) {
                dto.setStatus(AcknowledgementType.AR0);
            }
        }

        try {
            dto.setCreatedAt(Files.getLastModifiedTime(filePath).toInstant());
            dto.setUpdatedAt(dto.getCreatedAt());
        } catch (IOException e) {
            dto.setCreatedAt(Instant.now());
        }
        dto.setPeriod("2024-01");
        return dto;
    }

    private Path findFile(String documentId) throws IOException {
        return Files.walk(Paths.get(storageRoot))
                .filter(p -> p.getFileName().toString().startsWith(documentId + "."))
                .findFirst()
                .orElseThrow(() -> new FileNotFoundException("Document " + documentId + " not found"));
    }

    public static class FileNotFoundException extends IOException {
        public FileNotFoundException(String msg) { super(msg); }
    }

    public List<Acknowledgement> getAcknowledgements(String documentId) {
        return Collections.emptyList();
    }
}

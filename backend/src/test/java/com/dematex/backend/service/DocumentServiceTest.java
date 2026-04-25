package com.dematex.backend.service;

import com.dematex.backend.dto.DocumentDTO;
import com.dematex.backend.dto.PaginatedResponse;
import com.dematex.backend.model.AcknowledgementType;
import com.dematex.backend.model.AuditLog;
import com.dematex.backend.model.DocumentType;
import com.dematex.backend.model.Document;
import com.dematex.backend.repository.DocumentRepository;
import com.dematex.backend.repository.AcknowledgementRepository;
import com.dematex.backend.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class DocumentServiceTest {

    @TempDir
    Path tempDir;

    @InjectMocks
    private DocumentService documentService;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private AcknowledgementRepository acknowledgementRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private EventService eventService;

    @BeforeEach
    public void setup() {
        ReflectionTestUtils.setField(documentService, "storageRoot", "./regulatory_files");
    }

    @Test
    public void testSlaCalculation_Late() {
        // GIVEN: Un document créé il y a 3 jours, sans AR3
        Document doc = Document.builder()
                .documentId("DOC-LATE")
                .status(AcknowledgementType.AR0)
                .createdAt(Instant.now().minus(3, ChronoUnit.DAYS))
                .build();

        when(documentRepository.findById("DOC-LATE")).thenReturn(Optional.of(doc));

        // WHEN
        Optional<DocumentDTO> result = documentService.getDocument("DOC-LATE");

        // THEN
        assertTrue(result.isPresent());
        assertTrue(result.get().isLate(), "Le document devrait être marqué comme en retard");
    }

    @Test
    public void testSlaCalculation_OnTime() {
        // GIVEN: Un document créé il y a 1 heure
        Document doc = Document.builder()
                .documentId("DOC-OK")
                .status(AcknowledgementType.AR0)
                .createdAt(Instant.now().minus(1, ChronoUnit.HOURS))
                .build();

        when(documentRepository.findById("DOC-OK")).thenReturn(Optional.of(doc));

        // WHEN
        Optional<DocumentDTO> result = documentService.getDocument("DOC-OK");

        // THEN
        assertTrue(result.isPresent());
        assertFalse(result.get().isLate(), "Le document ne devrait pas être en retard");
    }

    @Test
    public void testSlaCalculation_WithAR3() {
        // GIVEN: Un document créé il y a 3 jours MAIS avec AR3 déjà reçu
        Document doc = Document.builder()
                .documentId("DOC-AR3")
                .status(AcknowledgementType.AR3)
                .createdAt(Instant.now().minus(3, ChronoUnit.DAYS))
                .build();

        when(documentRepository.findById("DOC-AR3")).thenReturn(Optional.of(doc));

        // WHEN
        Optional<DocumentDTO> result = documentService.getDocument("DOC-AR3");

        // THEN
        assertTrue(result.isPresent());
        assertFalse(result.get().isLate(), "Un document avec AR3 n'est jamais en retard");
    }

    @Test
    void getDocuments_normalizesFilePathSearchFromHeader() {
        when(documentRepository.findDocumentsWithFilters(
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq("doc_202603_FTIS_B2BD_0001.zip"),
                eq(null),
                any(Instant.class),
                any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(List.of());
        when(documentRepository.countDocumentsWithFilters(
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq("doc_202603_FTIS_B2BD_0001.zip"),
                eq(null),
                any(Instant.class)))
                .thenReturn(0L);

        documentService.getDocuments(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "C:\\exports\\REC1\\ENT1\\VTIS\\doc_202603_FTIS_B2BD_0001.zip.AR3",
                null,
                20);

        verify(documentRepository).findDocumentsWithFilters(
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq("doc_202603_FTIS_B2BD_0001.zip"),
                eq(null),
                any(Instant.class),
                any(org.springframework.data.domain.Pageable.class));
        verify(documentRepository).countDocumentsWithFilters(
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq(null),
                eq("doc_202603_FTIS_B2BD_0001.zip"),
                eq(null),
                any(Instant.class));
    }

    @Test
    void searchAuditLogs_appliesCursorPaginationAndEntityScope() {
        AuditLog newest = AuditLog.builder()
                .id(42L)
                .user("alice")
                .action("FILE_UPLOAD")
                .issuerCode("REC1")
                .entityCode("ENT1")
                .build();
        AuditLog older = AuditLog.builder()
                .id(41L)
                .user("alice")
                .action("FILE_UPLOAD")
                .issuerCode("REC1")
                .entityCode("ENT1")
                .build();

        when(auditLogRepository.findWithFilters("REC1", "ENT1", "alice", null, null, null, org.springframework.data.domain.PageRequest.of(0, 2)))
                .thenReturn(List.of(newest, older));
        when(auditLogRepository.countWithFilters("REC1", "ENT1", "alice", null, null))
                .thenReturn(2L);

        PaginatedResponse<AuditLog> page = documentService.searchAuditLogs("REC1", "ENT1", "alice", null, null, null, 1);

        assertEquals(1, page.getItems().size());
        assertEquals(42L, page.getItems().getFirst().getId());
        assertTrue(page.isHasMore());
        assertEquals("42", page.getNextCursor());
        assertEquals(2L, page.getTotalCount());
    }

    @Test
    void exportAuditCsv_includesScopedColumns() {
        AuditLog log = AuditLog.builder()
                .timestamp(Instant.parse("2026-04-25T10:15:30Z"))
                .user("alice")
                .action("FILE_UPLOAD")
                .resource("REC1/ENT1/VTIS/doc.AR0")
                .documentId("REC1_ENT1_doc")
                .issuerCode("REC1")
                .entityCode("ENT1")
                .status("AR0")
                .build();

        when(auditLogRepository.findAllWithFilters("REC1", "ENT1", "alice", "FILE_UPLOAD", null))
                .thenReturn(List.of(log));

        String csv = new String(documentService.exportAuditCsv("REC1", "ENT1", "alice", "FILE_UPLOAD", null));

        assertTrue(csv.contains("documentId,issuerCode,entityCode,status"));
        assertTrue(csv.contains("\"REC1_ENT1_doc\""));
        assertTrue(csv.contains("\"ENT1\""));
    }

    @Test
    void syncFileSystemToIndex_skipsUnchangedFilesWhenPersistedBaselineExists() throws Exception {
        Path issuerDir = Files.createDirectories(tempDir.resolve("REC1").resolve("ENT1").resolve("VTIS"));
        Path file = issuerDir.resolve("doc_202401.AR3");
        Files.writeString(file, "content");

        Instant baseline = Instant.now();
        Files.setLastModifiedTime(file, java.nio.file.attribute.FileTime.from(baseline.minus(5, ChronoUnit.MINUTES)));

        ReflectionTestUtils.setField(documentService, "storageRoot", tempDir.toString());
        when(documentRepository.findLatestActivityTimestamp()).thenReturn(baseline);

        documentService.syncFileSystemToIndex();

        verify(documentRepository, never()).findExistingIds(org.mockito.ArgumentMatchers.anyList());
        verify(documentRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
        verify(auditLogRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
        verify(documentRepository).deleteByLastSeenAtBefore(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void syncAffectedPath_indexesOnlyTouchedTypeDirectory() throws Exception {
        Path file = Files.createDirectories(tempDir.resolve("REC1").resolve("ENT1").resolve("VTIS"))
                .resolve("doc_202401.AR3");
        Files.writeString(file, "content");

        ReflectionTestUtils.setField(documentService, "storageRoot", tempDir.toString());
        when(documentRepository.findByIssuerCodeAndEntityCodeAndType("REC1", "ENT1", DocumentType.VTIS))
                .thenReturn(List.of());

        documentService.syncAffectedPath(file);

        verify(documentRepository).findByIssuerCodeAndEntityCodeAndType("REC1", "ENT1", DocumentType.VTIS);
        verify(documentRepository).saveAll(org.mockito.ArgumentMatchers.anyList());
        verify(auditLogRepository).saveAll(org.mockito.ArgumentMatchers.anyList());
        verify(documentRepository, never()).findLatestActivityTimestamp();
        verify(documentRepository, never()).deleteByLastSeenAtBefore(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void syncAffectedPath_deletesMissingTypeDirectoryWithoutFullRescan() {
        Path typeDir = tempDir.resolve("REC1").resolve("ENT1").resolve("VTIS");
        Document existing = Document.builder()
                .documentId("REC1_ENT1_doc_202401")
                .issuerCode("REC1")
                .entityCode("ENT1")
                .type(DocumentType.VTIS)
                .build();

        ReflectionTestUtils.setField(documentService, "storageRoot", tempDir.toString());
        when(documentRepository.findByIssuerCodeAndEntityCodeAndType("REC1", "ENT1", DocumentType.VTIS))
                .thenReturn(List.of(existing));

        documentService.syncAffectedPath(typeDir);

        verify(documentRepository).deleteAllInBatch(List.of(existing));
        verify(documentRepository, never()).findLatestActivityTimestamp();
        verify(documentRepository, never()).deleteByLastSeenAtBefore(org.mockito.ArgumentMatchers.any());
    }
}

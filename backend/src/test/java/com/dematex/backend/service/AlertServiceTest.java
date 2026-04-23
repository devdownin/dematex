package com.dematex.backend.service;

import com.dematex.backend.model.AcknowledgementType;
import com.dematex.backend.model.Alert;
import com.dematex.backend.model.AlertType;
import com.dematex.backend.model.Document;
import com.dematex.backend.model.DocumentType;
import com.dematex.backend.repository.AlertRepository;
import com.dematex.backend.repository.AuditLogRepository;
import com.dematex.backend.repository.DocumentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

    @InjectMocks
    private AlertService alertService;

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private EventService eventService;

    @Mock
    private ValidationService validationService;

    @Mock
    private StorageService storageService;

    @Test
    void detectAnomalies_createsMissingArAndMissingReceptionAlerts() {
        Document lateDocument = Document.builder()
                .documentId("REC1_ENT1_doc_202401")
                .issuerCode("REC1")
                .entityCode("ENT1")
                .period("2024-01")
                .type(DocumentType.VTIS)
                .status(AcknowledgementType.AR0)
                .createdAt(Instant.now().minus(3, ChronoUnit.DAYS))
                .build();

        when(documentRepository.findAll()).thenReturn(List.of(lateDocument));
        when(alertRepository.findByResolvedAtIsNullOrderByDetectedAtDesc()).thenReturn(List.of());

        alertService.detectAnomalies();

        ArgumentCaptor<List<Alert>> captor = ArgumentCaptor.forClass(List.class);
        verify(alertRepository).saveAll(captor.capture());
        verify(eventService).broadcast(eq("alerts-updated"), anyMap());

        List<Alert> savedAlerts = captor.getValue();
        assertTrue(savedAlerts.stream().anyMatch(alert -> alert.getType() == AlertType.MISSING_AR));
        assertTrue(savedAlerts.stream().anyMatch(alert -> alert.getType() == AlertType.MISSING_RECEPTION));
    }

    @Test
    void detectAnomalies_createsAmountMismatchAlert() throws Exception {
        Document crmensDoc = Document.builder()
                .documentId("REC1_ENT1_CRMENS")
                .issuerCode("REC1")
                .entityCode("ENT1")
                .period("2024-03")
                .type(DocumentType.CRMENS)
                .build();
        Document vtisDoc = Document.builder()
                .documentId("REC1_ENT1_VTIS")
                .issuerCode("REC1")
                .entityCode("ENT1")
                .period("2024-03")
                .type(DocumentType.VTIS)
                .build();

        when(documentRepository.findAll()).thenReturn(List.of(crmensDoc, vtisDoc));
        when(alertRepository.findByResolvedAtIsNullOrderByDetectedAtDesc()).thenReturn(List.of());

        when(storageService.getFileContent(eq("REC1"), eq("ENT1"), eq("CRMENS"), eq("REC1_ENT1_CRMENS"))).thenReturn(new byte[0]);
        when(storageService.getFileContent(eq("REC1"), eq("ENT1"), eq("VTIS"), eq("REC1_ENT1_VTIS"))).thenReturn(new byte[0]);

        when(validationService.parseCrmens(any())).thenReturn(ValidationService.CrmensContent.builder()
                .totalTtc(new java.math.BigDecimal("1000.00"))
                .build());
        when(validationService.parseVtis(any())).thenReturn(ValidationService.VtisContent.builder()
                .rub1(new java.math.BigDecimal("500.00"))
                .rub2(new java.math.BigDecimal("200.00"))
                .rub3(new java.math.BigDecimal("200.00")) // Total 900 != 1000
                .build());

        alertService.detectAnomalies();

        ArgumentCaptor<List<Alert>> captor = ArgumentCaptor.forClass(List.class);
        verify(alertRepository).saveAll(captor.capture());

        List<Alert> savedAlerts = captor.getValue();
        assertTrue(savedAlerts.stream().anyMatch(alert -> alert.getCode().equals("ALT-AMT-VTIS-MISMATCH")));
    }
}

package com.dematex.backend.service;

import com.dematex.backend.dto.DocumentDTO;
import com.dematex.backend.model.AcknowledgementType;
import com.dematex.backend.model.Document;
import com.dematex.backend.model.DocumentType;
import com.dematex.backend.repository.DocumentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@SpringBootTest
public class DocumentServiceTest {

    @Autowired
    private DocumentService documentService;

    @MockitoBean
    private DocumentRepository documentRepository;

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
}

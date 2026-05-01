package com.dematex.backend.controller;

import com.dematex.backend.config.SecurityUtils;
import com.dematex.backend.dto.DocumentDTO;
import com.dematex.backend.dto.PaginatedResponse;
import com.dematex.backend.model.AuditLog;
import com.dematex.backend.model.AcknowledgementType;
import com.dematex.backend.model.User;
import com.dematex.backend.service.AuthService;
import com.dematex.backend.service.DocumentService;
import com.dematex.backend.service.EventService;
import com.dematex.backend.service.SignedDownloadService;
import com.dematex.backend.service.StorageService;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class DocumentControllerTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @MockitoBean
    private DocumentService documentService;

    @MockitoBean
    private EventService eventService;

    @MockitoBean
    private SignedDownloadService signedDownloadService;

    @MockitoBean
    private StorageService storageService;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private SecurityUtils securityUtils;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @Test
    void getAuditLogs_usesIssuerAndEntityScopeFromCurrentUser() throws Exception {
        User user = User.builder()
                .username("entity-user")
                .role("ROLE_USER")
                .allowedIssuer("REC1")
                .legalEntityCode("ENT1")
                .build();
        when(securityUtils.getCurrentUser()).thenReturn(user);
        when(documentService.searchAuditLogs("REC1", "ENT1", null, null, null, null, 100))
                .thenReturn(new PaginatedResponse<>(List.<AuditLog>of(), null, false, 0));

        mockMvc.perform(get("/api/v1/audit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.totalCount").value(0));

        verify(documentService).searchAuditLogs("REC1", "ENT1", null, null, null, null, 100);
    }

    @Test
    void exportAuditLogs_keepsCurrentFiltersWithinUserScope() throws Exception {
        User user = User.builder()
                .username("entity-user")
                .role("ROLE_USER")
                .allowedIssuer("REC1")
                .legalEntityCode("ENT1")
                .build();
        when(securityUtils.getCurrentUser()).thenReturn(user);
        when(documentService.exportAuditCsv("REC1", "ENT1", "alice", "FILE_UPLOAD", null))
                .thenReturn("timestamp,user\n".getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(get("/api/v1/audit/export")
                .param("user", "alice")
                .param("action", "FILE_UPLOAD"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"audit-export.csv\""))
                .andExpect(content().string("timestamp,user\n"));

        verify(documentService).exportAuditCsv("REC1", "ENT1", "alice", "FILE_UPLOAD", null);
    }

    @Test
    void addAcknowledgement_checksDocumentScopeBeforeUpdate() throws Exception {
        DocumentDTO doc = new DocumentDTO();
        doc.setDocumentId("DOC-1");
        doc.setIssuerCode("Indigo");
        doc.setEntityCode("ENT1");
        doc.setStatus(AcknowledgementType.AR0);
        when(documentService.getDocumentOrThrow("DOC-1")).thenReturn(doc);

        mockMvc.perform(post("/api/v1/entities/ENT1/documents/DOC-1/acknowledgements")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"AR3\",\"details\":\"validated\"}"))
                .andExpect(status().isOk());

        verify(securityUtils).checkDocumentAccess("Indigo", "ENT1");
        verify(documentService).addAcknowledgement("ENT1", "DOC-1", AcknowledgementType.AR3, "validated");
    }

    @Test
    void getContent_checksDocumentScopeWhenSignatureIsValid() throws Exception {
        DocumentDTO doc = new DocumentDTO();
        doc.setDocumentId("DOC-1");
        doc.setIssuerCode("Indigo");
        doc.setEntityCode("ENT1");
        when(signedDownloadService.isValid("DOC-1", 123L, "sig")).thenReturn(true);
        when(documentService.getDocumentOrThrow("DOC-1")).thenReturn(doc);
        when(documentService.getFileContent("DOC-1")).thenReturn("payload".getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(get("/api/v1/documents/DOC-1/content")
                .param("expiresAt", "123")
                .param("signature", "sig"))
                .andExpect(status().isOk())
                .andExpect(content().bytes(new byte[0]));

        verify(securityUtils).checkDocumentAccess("Indigo", "ENT1");
        verify(documentService).recordDocumentDownload("DOC-1");
    }

    @Test
    void uploadDocument_requiresVautGuard() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "demo.zip",
                MediaType.APPLICATION_OCTET_STREAM_VALUE,
                "payload".getBytes(StandardCharsets.UTF_8));
        when(storageService.uploadFile("Indigo", "ENT1", "FTIS", "xml", file)).thenReturn("/tmp/demo.zip");

        mockMvc.perform(multipart("/api/v1/documents/upload")
                .file(file)
                .param("destinataire", "Indigo")
                .param("entity", "ENT1")
                .param("type", "FTIS")
                .param("statut", "xml"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("uploaded"));

        verify(securityUtils).checkVautAccess();
        verify(storageService).uploadFile("Indigo", "ENT1", "FTIS", "xml", file);
    }
}

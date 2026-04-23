package com.dematex.backend.controller;

import com.dematex.backend.dto.PortalConfigDTO;
import com.dematex.backend.model.AuditLog;
import com.dematex.backend.repository.AuditLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoint pour récupérer et modifier la configuration du portail.
 * Les valeurs sont mutables en mémoire (réinitialisées au redémarrage).
 */
@RestController
@RequestMapping("/api/v1/config")
@RequiredArgsConstructor
@Tag(name = "Portal Configuration", description = "Lecture et mise à jour de la configuration du portail")
public class PortalConfigController {

    private final AuditLogRepository auditLogRepository;
    private final com.dematex.backend.repository.PortalConfigRepository portalConfigRepository;

    @Value("${portal.company-name:Dematex}")
    private String companyName;

    @Value("${portal.logo-url:}")
    private String logoUrl;

    @Value("${portal.primary-color:#3f51b5}")
    private String primaryColor;

    @Value("${portal.support-email:support@dematex.com}")
    private String supportEmail;

    @Value("${portal.entity-code:ENT_ALPHA}")
    private String entityCode;

    @Value("${storage.root:./regulatory_files}")
    private String storageRoot;

    @Operation(summary = "Configuration actuelle du portail")
    @GetMapping
    public PortalConfigDTO getConfig() {
        com.dematex.backend.model.PortalConfig config = portalConfigRepository.findById("current")
                .orElseGet(this::createDefaultConfig);
        
        return convertToDTO(config);
    }

    @Operation(summary = "Mettre à jour la configuration du portail",
               description = "Met à jour les paramètres et les persiste en base de données.")
    @PutMapping
    public ResponseEntity<Map<String, String>> updateConfig(@RequestBody PortalConfigDTO dto) {
        com.dematex.backend.model.PortalConfig config = portalConfigRepository.findById("current")
                .orElseGet(this::createDefaultConfig);

        if (dto.getCompanyName() != null) config.setCompanyName(dto.getCompanyName());
        if (dto.getLogoUrl() != null) config.setLogoUrl(dto.getLogoUrl());
        if (dto.getPrimaryColor() != null) config.setPrimaryColor(dto.getPrimaryColor());
        if (dto.getSupportEmail() != null) config.setSupportEmail(dto.getSupportEmail());
        if (dto.getEntityCode() != null) config.setEntityCode(dto.getEntityCode());
        if (dto.getStorageRoot() != null) config.setStorageRoot(dto.getStorageRoot());

        portalConfigRepository.save(config);

        auditLogRepository.save(AuditLog.builder()
                .user("admin")
                .action("CONFIG_UPDATE")
                .resource("portal-config")
                .status("Paramètres persistés")
                .build());

        return ResponseEntity.ok(Map.of("message", "Configuration mise à jour et persistée"));
    }

    private com.dematex.backend.model.PortalConfig createDefaultConfig() {
        return com.dematex.backend.model.PortalConfig.builder()
                .id("current")
                .companyName(companyName)
                .logoUrl(logoUrl)
                .primaryColor(primaryColor)
                .supportEmail(supportEmail)
                .entityCode(entityCode)
                .storageRoot(storageRoot)
                .build();
    }

    private PortalConfigDTO convertToDTO(com.dematex.backend.model.PortalConfig config) {
        return PortalConfigDTO.builder()
                .companyName(config.getCompanyName())
                .logoUrl(config.getLogoUrl())
                .primaryColor(config.getPrimaryColor())
                .supportEmail(config.getSupportEmail())
                .entityCode(config.getEntityCode())
                .storageRoot(config.getStorageRoot())
                .build();
    }
}

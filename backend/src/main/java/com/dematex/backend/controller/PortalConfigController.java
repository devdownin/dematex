package com.dematex.backend.controller;

import com.dematex.backend.dto.PortalConfigDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint pour récupérer la configuration de personnalisation (Branding) du portail.
 */
@RestController
@RequestMapping("/api/v1/config")
public class PortalConfigController {

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

    @GetMapping
    public PortalConfigDTO getConfig() {
        return PortalConfigDTO.builder()
                .companyName(companyName)
                .logoUrl(logoUrl)
                .primaryColor(primaryColor)
                .supportEmail(supportEmail)
                .entityCode(entityCode)
                .build();
    }
}

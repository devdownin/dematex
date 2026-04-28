package com.dematex.backend.controller;

import com.dematex.backend.config.SecurityUtils;
import com.dematex.backend.dto.AlertSummary;
import com.dematex.backend.model.Alert;
import com.dematex.backend.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
@Tag(name = "Alerts", description = "API de diffusion des anomalies et alertes")
public class AlertController {
    private final AlertService alertService;
    private final SecurityUtils securityUtils;

    @Operation(summary = "Liste des alertes actives")
    @GetMapping
    public List<Alert> getActiveAlerts() {
        return alertService.getActiveAlerts(securityUtils.getEffectiveIssuer());
    }

    @Operation(summary = "Synthese des alertes")
    @GetMapping("/summary")
    public AlertSummary getSummary() {
        return alertService.getSummary(securityUtils.getEffectiveIssuer());
    }
}

package com.dematex.backend.controller;

import com.dematex.backend.config.SecurityUtils;
import com.dematex.backend.dto.DeliveryDTO;
import com.dematex.backend.dto.PaginatedResponse;
import com.dematex.backend.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Deliveries (ETL)", description = "API delta optimisée pour consommation programmatique (ETL, Informatica)")
public class DeliveryController {

    private final DocumentService documentService;
    private final SecurityUtils securityUtils;

    @Operation(
        summary = "Liste incrémentale des livraisons",
        description = "Retourne les documents mis à jour depuis `since`, triés par (updatedAt, fileId). " +
                      "Utiliser `cursor` du résultat précédent pour paginer. " +
                      "Flux typique ETL : poll delta → télécharger → acquitter."
    )
    @GetMapping("/deliveries")
    public PaginatedResponse<DeliveryDTO> getDeliveries(
            @Parameter(description = "Timestamp ISO-8601 inclus (ex: 2026-04-01T00:00:00Z)")
            @RequestParam(required = false) Instant since,
            @Parameter(description = "Curseur opaque issu de nextCursor de la réponse précédente")
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "500") int limit,
            @Parameter(description = "Filtrer par entité juridique")
            @RequestParam(required = false) String entityCode) {

        String effectiveIssuer = securityUtils.getEffectiveIssuer();
        String effectiveEntity = resolveEntity(entityCode);
        int safeLimit = Math.min(limit, 2000);

        return documentService.getDeliveries(effectiveIssuer, effectiveEntity, since, cursor, safeLimit);
    }

    @Operation(
        summary = "Export manifeste de livraisons",
        description = "Retourne l'intégralité des livraisons depuis `since` en JSONL ou CSV. " +
                      "Chaque ligne JSONL est un objet complet avec sha256, size et downloadUrl. " +
                      "Limité à 50 000 documents par appel."
    )
    @GetMapping("/deliveries/export")
    public ResponseEntity<Resource> exportDeliveries(
            @Parameter(description = "Timestamp ISO-8601 inclus (ex: 2026-04-01T00:00:00Z)")
            @RequestParam(required = false) Instant since,
            @Parameter(description = "Format de sortie : jsonl (défaut) ou csv")
            @RequestParam(defaultValue = "jsonl") String format,
            @RequestParam(required = false) String entityCode) {

        String effectiveIssuer = securityUtils.getEffectiveIssuer();
        String effectiveEntity = resolveEntity(entityCode);

        byte[] content = documentService.exportDeliveries(effectiveIssuer, effectiveEntity, since, format);

        boolean isCsv = "csv".equalsIgnoreCase(format);
        String filename = "deliveries-export." + (isCsv ? "csv" : "jsonl");
        MediaType mediaType = isCsv ? MediaType.parseMediaType("text/csv") : MediaType.parseMediaType("application/x-ndjson");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(mediaType)
                .contentLength(content.length)
                .body(new ByteArrayResource(content));
    }

    private String resolveEntity(String entityCode) {
        if (entityCode != null) {
            securityUtils.checkEntityAccess(entityCode);
            return entityCode;
        }
        return securityUtils.getCurrentUser().getLegalEntityCode();
    }
}

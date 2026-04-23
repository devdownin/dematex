package com.dematex.backend.controller;

import com.dematex.backend.config.SecurityUtils;
import com.dematex.backend.service.DocumentService;
import com.dematex.backend.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
@Tag(name = "System Settings", description = "Gestion de la structure de stockage, renommage de fichiers et synchronisation de l'index")
public class SettingsController {

    private final StorageService storageService;
    private final DocumentService documentService;
    private final SecurityUtils securityUtils;

    @Operation(summary = "Structure de stockage actuelle", description = "Retourne l'arborescence des répertoires et la liste des fichiers avec leurs métadonnées")
    @GetMapping("/storage/structure")
    public ResponseEntity<Map<String, Object>> getStorageStructure() {
        return ResponseEntity.ok(storageService.getStructure(securityUtils.getEffectiveIssuer()));
    }

    @Operation(summary = "Renommer un fichier", description = "Renomme un fichier (nom et/ou extension). Déclenche automatiquement la mise à jour de l'index H2.")
    @PostMapping("/storage/rename")
    public ResponseEntity<Map<String, String>> renameFile(@RequestBody RenameRequest request) {
        try {
            String result = storageService.renameFile(request.getDocumentId(), request.getNewName(), request.getNewExtension());
            documentService.syncFileSystemToIndex();
            return ResponseEntity.ok(Map.of("message", "Fichier renommé avec succès", "newPath", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Déplacer des fichiers (réorganisation)", description = "Déplace un ou plusieurs fichiers vers une nouvelle structure de répertoires. Met à jour l'index H2.")
    @PostMapping("/storage/move")
    public ResponseEntity<Map<String, Object>> moveFiles(@RequestBody MoveRequest request) {
        try {
            List<String> moved = storageService.moveFiles(request.getDocumentIds(), request.getTargetIssuer(), request.getTargetEntity(), request.getTargetType());
            documentService.syncFileSystemToIndex();
            return ResponseEntity.ok(Map.of("moved", moved, "count", moved.size()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Renommage par lot (extension)", description = "Change l'extension de tous les fichiers correspondant aux critères. Utile pour une mise à jour de statut en masse.")
    @PostMapping("/storage/bulk-rename")
    public ResponseEntity<Map<String, Object>> bulkRename(@RequestBody BulkRenameRequest request) {
        try {
            int count = storageService.bulkRenameExtension(request.getIssuer(), request.getEntity(), request.getType(), request.getFromExtension(), request.getToExtension());
            documentService.syncFileSystemToIndex();
            return ResponseEntity.ok(Map.of("message", "Renommage effectué", "filesRenamed", count));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Forcer la synchronisation de l'index", description = "Déclenche manuellement la synchronisation filesystem → base H2")
    @PostMapping("/storage/sync")
    public ResponseEntity<Map<String, String>> triggerSync() {
        documentService.syncFileSystemToIndex();
        return ResponseEntity.ok(Map.of("message", "Synchronisation terminée"));
    }

    @lombok.Data
    public static class RenameRequest {
        private String documentId;
        private String newName;
        private String newExtension;
    }

    @lombok.Data
    public static class MoveRequest {
        private List<String> documentIds;
        private String targetIssuer;
        private String targetEntity;
        private String targetType;
    }

    @lombok.Data
    public static class BulkRenameRequest {
        private String issuer;
        private String entity;
        private String type;
        private String fromExtension;
        private String toExtension;
    }
}

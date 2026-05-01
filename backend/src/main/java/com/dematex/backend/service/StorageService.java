package com.dematex.backend.service;

import com.dematex.backend.config.SecurityUtils;
import com.dematex.backend.exception.BusinessException;
import com.dematex.backend.exception.ResourceNotFoundException;
import com.dematex.backend.exception.StorageException;
import com.dematex.backend.model.AuditLog;
import com.dematex.backend.model.Document;
import com.dematex.backend.repository.AuditLogRepository;
import com.dematex.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;
    private final SecurityUtils securityUtils;

    @Value("${storage.root:./regulatory_files}")
    private String storageRoot;

    /**
     * Retourne la structure complète de l'arborescence de stockage.
     */
    public Map<String, Object> getStructure(String allowedIssuer) {
        Path root = Paths.get(storageRoot).toAbsolutePath();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("rootPath", root.toString());

        if (!Files.exists(root)) {
            result.put("issuers", List.of());
            return result;
        }

        List<Map<String, Object>> issuers = new ArrayList<>();
        try (Stream<Path> issuerPaths = Files.list(root)) {
            issuerPaths.filter(Files::isDirectory)
                    .filter(p -> allowedIssuer == null || p.getFileName().toString().equals(allowedIssuer))
                    .sorted().forEach(issuerPath -> {
                Map<String, Object> issuer = new LinkedHashMap<>();
                issuer.put("name", issuerPath.getFileName().toString());

                List<Map<String, Object>> entities = new ArrayList<>();
                try (Stream<Path> entityPaths = Files.list(issuerPath)) {
                    entityPaths.filter(Files::isDirectory).sorted().forEach(entityPath -> {
                        Map<String, Object> entity = new LinkedHashMap<>();
                        entity.put("name", entityPath.getFileName().toString());

                        List<Map<String, Object>> types = new ArrayList<>();
                        try (Stream<Path> typePaths = Files.list(entityPath)) {
                            typePaths.filter(Files::isDirectory).sorted().forEach(typePath -> {
                                Map<String, Object> type = new LinkedHashMap<>();
                                type.put("name", typePath.getFileName().toString());

                                List<Map<String, String>> files = new ArrayList<>();
                                try (Stream<Path> filePaths = Files.list(typePath)) {
                                    filePaths.filter(Files::isRegularFile).sorted().forEach(filePath -> {
                                        String filename = filePath.getFileName().toString();
                                        int lastDot = filename.lastIndexOf('.');
                                        Map<String, String> file = new LinkedHashMap<>();
                                        file.put("filename", filename);
                                        file.put("baseName", lastDot > 0 ? filename.substring(0, lastDot) : filename);
                                        file.put("extension", lastDot > 0 ? filename.substring(lastDot + 1) : "");
                                        try {
                                            file.put("size", String.valueOf(Files.size(filePath)));
                                            file.put("lastModified", Files.getLastModifiedTime(filePath).toInstant().toString());
                                        } catch (IOException ignored) {}
                                        files.add(file);
                                    });
                                } catch (IOException ignored) {}

                                type.put("files", files);
                                type.put("fileCount", files.size());
                                types.add(type);
                            });
                        } catch (IOException ignored) {}

                        entity.put("types", types);
                        entities.add(entity);
                    });
                } catch (IOException ignored) {}

                issuer.put("entities", entities);
                issuers.add(issuer);
            });
        } catch (IOException e) {
            log.error("Erreur lors de la lecture de la structure", e);
        }

        result.put("issuers", issuers);
        return result;
    }

    public List<String> getIssuers(String allowedIssuer) {
        Path root = Paths.get(storageRoot).toAbsolutePath();
        if (!Files.exists(root)) return List.of();
        try (Stream<Path> paths = Files.list(root)) {
            return paths.filter(Files::isDirectory)
                    .filter(p -> allowedIssuer == null || p.getFileName().toString().equals(allowedIssuer))
                    .map(p -> p.getFileName().toString())
                    .sorted()
                    .toList();
        } catch (IOException e) {
            log.error("Error listing issuers", e);
            return List.of();
        }
    }

    public List<String> getEntities(String issuer) {
        Path root = Paths.get(storageRoot).toAbsolutePath();
        Path issuerPath = root.resolve(issuer);
        if (!Files.exists(issuerPath)) return List.of();
        try (Stream<Path> paths = Files.list(issuerPath)) {
            return paths.filter(Files::isDirectory)
                    .map(p -> p.getFileName().toString())
                    .sorted()
                    .toList();
        } catch (IOException e) {
            log.error("Error listing entities", e);
            return List.of();
        }
    }

    public List<Map<String, Object>> getTypes(String issuer, String entity) {
        Path root = Paths.get(storageRoot).toAbsolutePath();
        Path entityPath = root.resolve(issuer).resolve(entity);
        if (!Files.exists(entityPath)) return List.of();
        try (Stream<Path> paths = Files.list(entityPath)) {
            return paths.filter(Files::isDirectory)
                    .sorted()
                    .map(p -> {
                        Map<String, Object> type = new LinkedHashMap<>();
                        type.put("name", p.getFileName().toString());
                        try (Stream<Path> files = Files.list(p)) {
                            type.put("fileCount", files.filter(Files::isRegularFile).count());
                        } catch (IOException e) {
                            type.put("fileCount", 0);
                        }
                        return type;
                    })
                    .toList();
        } catch (IOException e) {
            log.error("Error listing types", e);
            return List.of();
        }
    }

    public List<Map<String, String>> getFiles(String issuer, String entity, String type) {
        Path root = Paths.get(storageRoot).toAbsolutePath();
        Path typePath = root.resolve(issuer).resolve(entity).resolve(type);
        if (!Files.exists(typePath)) return List.of();
        try (Stream<Path> paths = Files.list(typePath)) {
            return paths.filter(Files::isRegularFile)
                    .sorted()
                    .map(p -> {
                        String filename = p.getFileName().toString();
                        int lastDot = filename.lastIndexOf('.');
                        Map<String, String> file = new LinkedHashMap<>();
                        file.put("filename", filename);
                        file.put("baseName", lastDot > 0 ? filename.substring(0, lastDot) : filename);
                        file.put("extension", lastDot > 0 ? filename.substring(lastDot + 1) : "");
                        try {
                            file.put("size", String.valueOf(Files.size(p)));
                            file.put("lastModified", Files.getLastModifiedTime(p).toInstant().toString());
                        } catch (IOException ignored) {}
                        return file;
                    })
                    .toList();
        } catch (IOException e) {
            log.error("Error listing files", e);
            return List.of();
        }
    }

    /**
     * Renomme un fichier identifié par son documentId.
     * @param documentId L'ID composite du document (issuer_entity_baseName)
     * @param newName Nouveau nom de base (sans extension). Null = garder l'actuel.
     * @param newExtension Nouvelle extension (ex: "AR3", "xml"). Null = garder l'actuelle.
     * @return Le nouveau chemin du fichier.
     */
    public byte[] getFileContent(String issuer, String entity, String type, String documentId) {
        try {
            return Files.readAllBytes(findFile(issuer, entity, type, documentId));
        } catch (IOException e) {
            throw new StorageException("Erreur lors de la lecture du fichier", e);
        }
    }

    public String renameFile(String documentId, String newName, String newExtension) {
        try {
            Document doc = documentRepository.findById(documentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Document introuvable: " + documentId));

            Path currentFile = findFile(doc);
            String currentFilename = currentFile.getFileName().toString();
            int lastDot = currentFilename.lastIndexOf('.');

            String baseName = lastDot > 0 ? currentFilename.substring(0, lastDot) : currentFilename;
            String extension = lastDot > 0 ? currentFilename.substring(lastDot + 1) : "";

            String finalName = (newName != null && !newName.isBlank()) ? newName : baseName;
            String finalExt = (newExtension != null && !newExtension.isBlank()) ? newExtension : extension;

            String newFilename = finalName + "." + finalExt;
            Path newPath = currentFile.resolveSibling(newFilename);

            if (Files.exists(newPath) && !newPath.equals(currentFile)) {
                throw new BusinessException("Un fichier avec ce nom existe déjà: " + newFilename);
            }

            Files.move(currentFile, newPath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Fichier renommé: {} -> {}", currentFile, newPath);

            auditLogRepository.save(AuditLog.builder()
                    .user(getCurrentUsername())
                    .action("FILE_RENAME")
                    .resource(documentId)
                    .documentId(documentId)
                    .issuerCode(doc.getIssuerCode())
                    .entityCode(doc.getEntityCode())
                    .status(currentFilename + " → " + newFilename)
                    .build());

            return newPath.toString();
        } catch (IOException e) {
            throw new StorageException("Erreur lors du renommage du fichier", e);
        }
    }

    /**
     * Déplace des fichiers vers une nouvelle structure de répertoires.
     */
    public List<String> moveFiles(List<String> documentIds, String targetIssuer, String targetEntity, String targetType) {
        try {
            Path root = Paths.get(storageRoot).toAbsolutePath();
            Path targetDir = root.resolve(targetIssuer).resolve(targetEntity).resolve(targetType);
            Files.createDirectories(targetDir);

            List<String> movedPaths = new ArrayList<>();
            for (String docId : documentIds) {
                Document doc = documentRepository.findById(docId).orElse(null);
                if (doc == null) {
                    log.warn("Document introuvable pour déplacement: {}", docId);
                    continue;
                }

                Path currentFile = findFile(doc);
                Path newPath = targetDir.resolve(currentFile.getFileName());

                if (Files.exists(newPath)) {
                    log.warn("Fichier déjà existant à la destination, ignoré: {}", newPath);
                    continue;
                }

                Files.move(currentFile, newPath, StandardCopyOption.REPLACE_EXISTING);
                movedPaths.add(newPath.toString());

                auditLogRepository.save(AuditLog.builder()
                        .user(getCurrentUsername())
                        .action("FILE_MOVE")
                        .resource(docId)
                        .documentId(docId)
                        .issuerCode(targetIssuer)
                        .entityCode(targetEntity)
                        .status(targetIssuer + "/" + targetEntity + "/" + targetType)
                        .build());
            }

            return movedPaths;
        } catch (IOException e) {
            throw new StorageException("Erreur lors du déplacement des fichiers", e);
        }
    }

    /**
     * Renomme en masse l'extension de tous les fichiers d'un répertoire donné.
     */
    public int bulkRenameExtension(String issuer, String entity, String type, String fromExtension, String toExtension) {
        try {
            Path root = Paths.get(storageRoot).toAbsolutePath();
            Path targetDir = root.resolve(issuer).resolve(entity).resolve(type);

            if (!Files.exists(targetDir)) {
                throw new ResourceNotFoundException("Répertoire introuvable: " + targetDir);
            }

            int count = 0;
            try (Stream<Path> files = Files.list(targetDir)) {
            List<Path> matchingFiles = files
                    .filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().endsWith("." + fromExtension))
                    .toList();

                for (Path file : matchingFiles) {
                    String filename = file.getFileName().toString();
                    String baseName = filename.substring(0, filename.lastIndexOf('.'));
                    Path newPath = file.resolveSibling(baseName + "." + toExtension);
                    Files.move(file, newPath, StandardCopyOption.REPLACE_EXISTING);
                    count++;
                }
            }

            if (count > 0) {
            auditLogRepository.save(AuditLog.builder()
                    .user(getCurrentUsername())
                    .action("BULK_RENAME")
                    .resource(issuer + "/" + entity + "/" + type)
                    .issuerCode(issuer)
                    .entityCode(entity)
                    .status(fromExtension + " → " + toExtension + " (" + count + " fichiers)")
                    .build());
        }

            log.info("Renommage en lot: {}/{}/{} — {} fichiers renommés (.{} → .{})",
                    issuer, entity, type, count, fromExtension, toExtension);
            return count;
        } catch (IOException e) {
            throw new StorageException("Erreur lors du renommage en masse", e);
        }
    }

    /**
     * Dépose un fichier dans l'arborescence de stockage.
     * Le chemin final est : storageRoot/{destinataire}/{entity}/{type}/filename.{statut}
     *
     * @param destinataire Répertoire racine (ex: REC_001)
     * @param entity       Code entité (ex: ENT_ALPHA)
     * @param type         Type de document (ex: FTIS, VTIS)
     * @param statut       Extension/statut du fichier (ex: xml, AR3)
     * @param file         Le fichier uploadé
     * @return Le chemin du fichier déposé
     */
    public String uploadFile(String destinataire, String entity, String type, String statut, MultipartFile file) {
        if (file.isEmpty()) {
            throw new BusinessException("Le fichier est vide");
        }

        try {
            // Validation des paramètres contre le path traversal
            validatePathSegment(destinataire, "destinataire");
            validatePathSegment(entity, "entity");
            validatePathSegment(type, "type");
            validatePathSegment(statut, "statut");

            // Extraire le nom de base du fichier original (sans extension)
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || originalFilename.isBlank()) {
                throw new BusinessException("Le nom du fichier est requis");
            }
            // Sanitize: ne garder que le nom du fichier, pas un éventuel chemin
            String safeName = Paths.get(originalFilename).getFileName().toString();
            int lastDot = safeName.lastIndexOf('.');
            String baseName = lastDot > 0 ? safeName.substring(0, lastDot) : safeName;
            validatePathSegment(baseName, "filename");

            String finalFilename = baseName + "." + statut;

            Path root = Paths.get(storageRoot).toAbsolutePath();
            Path targetDir = root.resolve(destinataire).resolve(entity).resolve(type);
            Files.createDirectories(targetDir);

            Path targetFile = targetDir.resolve(finalFilename);
            if (Files.exists(targetFile)) {
                throw new BusinessException("Un fichier avec ce nom existe déjà: " + finalFilename);
            }

            try (InputStream is = file.getInputStream()) {
                Files.copy(is, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }

            log.info("Fichier déposé: {}", targetFile);

            auditLogRepository.save(AuditLog.builder()
                    .user(getCurrentUsername())
                    .action("FILE_UPLOAD")
                    .resource(destinataire + "/" + entity + "/" + type + "/" + finalFilename)
                    .documentId(destinataire + "_" + entity + "_" + baseName)
                    .issuerCode(destinataire)
                    .entityCode(entity)
                    .status(statut)
                    .build());

            return targetFile.toString();
        } catch (IOException e) {
            throw new StorageException("Erreur lors de l'upload du fichier", e);
        }
    }

    private void validatePathSegment(String value, String paramName) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("Le paramètre '" + paramName + "' est requis");
        }
        if (value.contains("..") || value.contains("/") || value.contains("\\")) {
            throw new BusinessException("Le paramètre '" + paramName + "' contient des caractères invalides");
        }
    }

    private Path findFile(Document doc) throws IOException {
        Path root = Paths.get(storageRoot).toAbsolutePath();
        String issuer = doc.getIssuerCode();
        String entity = doc.getEntityCode();
        String type = doc.getType().name();

        String documentId = doc.getDocumentId();
        String prefix = issuer + "_" + entity + "_";
        String baseName = documentId.startsWith(prefix) ? documentId.substring(prefix.length()) : documentId;

        Path targetDir = root.resolve(issuer).resolve(entity).resolve(type);
        if (Files.exists(targetDir)) {
            try (Stream<Path> files = Files.list(targetDir)) {
                Optional<Path> found = files
                        .filter(p -> p.getFileName().toString().startsWith(baseName + "."))
                        .findFirst();
                if (found.isPresent()) return found.get();
            }
        }

        // Fallback: search all subdirectories
        Path parentDir = root.resolve(issuer).resolve(entity);
        if (Files.exists(parentDir)) {
            try (Stream<Path> files = Files.walk(parentDir)) {
                Optional<Path> found = files
                        .filter(Files::isRegularFile)
                        .filter(p -> p.getFileName().toString().startsWith(baseName + "."))
                        .findFirst();
                if (found.isPresent()) return found.get();
            }
        }

        throw new IOException("Fichier introuvable pour le document: " + documentId);
    }

    private Path findFile(String issuer, String entity, String type, String documentId) throws IOException {
        Path root = Paths.get(storageRoot).toAbsolutePath();
        String prefix = issuer + "_" + entity + "_";
        String baseName = documentId.startsWith(prefix) ? documentId.substring(prefix.length()) : documentId;

        Path targetDir = root.resolve(issuer).resolve(entity).resolve(type);
        if (Files.exists(targetDir)) {
            try (Stream<Path> files = Files.list(targetDir)) {
                Optional<Path> found = files
                        .filter(Files::isRegularFile)
                        .filter(p -> p.getFileName().toString().startsWith(baseName + "."))
                        .findFirst();
                if (found.isPresent()) return found.get();
            }
        }

        Path parentDir = root.resolve(issuer).resolve(entity);
        if (Files.exists(parentDir)) {
            try (Stream<Path> files = Files.walk(parentDir)) {
                Optional<Path> found = files
                        .filter(Files::isRegularFile)
                        .filter(p -> p.getFileName().toString().startsWith(baseName + "."))
                        .findFirst();
                if (found.isPresent()) return found.get();
            }
        }

        throw new IOException("Fichier introuvable pour le document: " + documentId);
    }

    private String getCurrentUsername() {
        try {
            return securityUtils.getCurrentUser().getUsername();
        } catch (org.springframework.security.access.AccessDeniedException ex) {
            return "system";
        }
    }
}

package com.dematex.backend.service;

import com.dematex.backend.model.DocumentType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class SchemaService {

    private final PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();

    public Map<String, List<String>> listSchemas() throws IOException {
        Map<String, List<String>> schemas = new HashMap<>();
        for (DocumentType type : DocumentType.values()) {
            String typeName = type.name().toLowerCase();
            Resource[] resources = resolver.getResources("classpath:schemas/" + typeName + "/*.xsd");
            List<String> versions = Arrays.stream(resources)
                    .map(r -> {
                        String filename = r.getFilename();
                        return filename != null ? filename.replace(".xsd", "") : null;
                    })
                    .filter(Objects::nonNull)
                    .sorted(Comparator.reverseOrder())
                    .collect(Collectors.toList());
            schemas.put(type.name(), versions);
        }
        return schemas;
    }

    public Resource getSchema(DocumentType type, String version) {
        String typeName = type.name().toLowerCase();
        String path = "classpath:schemas/" + typeName + "/" + version + ".xsd";
        Resource resource = resolver.getResource(path);
        if (!resource.exists()) {
            throw new IllegalArgumentException("Schéma introuvable : " + type + " version " + version);
        }
        return resource;
    }

    public Resource getLatestSchema(DocumentType type) throws IOException {
        List<String> versions = listSchemas().get(type.name());
        if (versions == null || versions.isEmpty()) {
            throw new IllegalArgumentException("Aucun schéma disponible pour " + type);
        }
        return getSchema(type, versions.get(0));
    }
}

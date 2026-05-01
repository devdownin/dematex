package com.dematex.backend.controller;

import com.dematex.backend.model.DocumentType;
import com.dematex.backend.service.SchemaService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/schemas")
@RequiredArgsConstructor
public class SchemaController {

    private final SchemaService schemaService;

    @GetMapping
    public ResponseEntity<Map<String, List<String>>> listSchemas() throws IOException {
        return ResponseEntity.ok(schemaService.listSchemas());
    }

    @GetMapping("/{type}/latest")
    public ResponseEntity<Resource> getLatestSchema(@PathVariable DocumentType type) throws IOException {
        Resource schema = schemaService.getLatestSchema(type);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_XML)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + schema.getFilename() + "\"")
                .body(schema);
    }

    @GetMapping("/{type}/{version}")
    public ResponseEntity<Resource> getSchema(@PathVariable DocumentType type, @PathVariable String version) {
        Resource schema = schemaService.getSchema(type, version);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_XML)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + schema.getFilename() + "\"")
                .body(schema);
    }
}

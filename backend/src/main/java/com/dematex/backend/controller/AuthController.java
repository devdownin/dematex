package com.dematex.backend.controller;

import com.dematex.backend.service.AuthService;
import com.dematex.backend.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Connexion et gestion de session")
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Connexion utilisateur")
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        return authService.login(request.getUsername(), request.getPassword())
                .map(token -> ResponseEntity.ok(Map.of("token", token)))
                .orElse(ResponseEntity.status(401).build());
    }

    @Operation(summary = "Infos utilisateur connecté")
    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }
        String token = authHeader.substring(7);
        return authService.getUserByToken(token)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(401).build());
    }

    @Operation(summary = "Déconnexion")
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            authService.logout(authHeader.substring(7));
        }
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Liste des profils disponibles")
    @GetMapping("/profiles")
    public List<Map<String, String>> getProfiles() {
        return authService.getAllUsers().stream()
                .map(u -> Map.of(
                        "username", u.getUsername(),
                        "fullName", u.getFullName(),
                        "role", u.getRole(),
                        "allowedIssuer", u.getAllowedIssuer() != null ? u.getAllowedIssuer() : "ALL"
                ))
                .toList();
    }

    @Data
    public static class LoginRequest {
        private String username;
        private String password;
    }
}

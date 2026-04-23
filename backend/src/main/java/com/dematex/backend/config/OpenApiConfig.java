package com.dematex.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI dematexOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Dematex - API de Supervision Réglementaire")
                        .description("API REST pour la gestion du cycle de vie des documents réglementaires, "
                                + "accusés de réception (AR0→AR3) et supervision du SLA.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Dematex Solutions")
                                .email("support@dematex.com")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new io.swagger.v3.oas.models.Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .name("bearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }

    @Bean
    public OpenApiCustomizer customerGlobalOpenApiCustomizer() {
        return openApi -> {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAdmin = auth != null && auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

            if (!isAdmin) {
                openApi.getPaths().entrySet().removeIf(entry ->
                    entry.getKey().startsWith("/api/v1/settings") ||
                    entry.getKey().startsWith("/api/v1/config") ||
                    entry.getKey().equals("/api/v1/documents/upload")
                );
            }
        };
    }
}

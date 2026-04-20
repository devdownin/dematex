package com.dematex.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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
                                .email("support@dematex.com")));
    }
}

package com.dematex.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortalConfig {
    @Id
    private String id; // Use a constant like "current"
    
    private String companyName;
    private String logoUrl;
    private String primaryColor;
    private String supportEmail;
    private String entityCode;
    private String storageRoot;
}

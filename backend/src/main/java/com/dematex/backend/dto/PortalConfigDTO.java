package com.dematex.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class PortalConfigDTO {
    private String companyName;
    private String logoUrl;
    private String primaryColor;
    private String supportEmail;
    private String entityCode;
    private String storageRoot;
}

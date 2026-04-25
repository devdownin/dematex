package com.dematex.backend.dto;

import com.dematex.backend.model.AcknowledgementType;
import com.dematex.backend.model.DocumentType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class DeliveryDTO {
    private String fileId;
    private String issuer;
    private String entity;
    private DocumentType type;
    private String period;
    private AcknowledgementType status;
    private Instant updatedAt;
    private Instant receivedAt;
    private Long size;
    private String sha256;
    private String originalFilename;
    private String mimeType;
    private boolean isLate;
    private Instant deadline;
    private String downloadUrl;
}

package com.dematex.backend.dto;

import com.dematex.backend.model.AcknowledgementType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class AcknowledgementResultDTO {
    private String documentId;
    private AcknowledgementType status;
    private String idempotencyKey;
    private Instant appliedAt;
    private boolean alreadyApplied;
}

package com.dematex.backend.dto;

import com.dematex.backend.model.AcknowledgementType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class BatchAcknowledgementResult {
    private int total;
    private int succeeded;
    private int failed;
    private List<ItemResult> results;

    @Data
    @Builder
    public static class ItemResult {
        private String documentId;
        private String idempotencyKey;
        private AcknowledgementType ackType;
        private AcknowledgementType previousStatus;
        private String resultStatus;
        private boolean alreadyApplied;
        private Instant appliedAt;
        private String errorCode;
        private String errorMessage;
    }
}

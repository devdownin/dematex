package com.dematex.backend.dto;

import com.dematex.backend.model.AcknowledgementType;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
public class BatchAcknowledgementRequest {
    private List<Item> items;

    @Data
    public static class Item {
        private String documentId;
        private AcknowledgementType ackType;
        private String idempotencyKey;
        private String externalReference;
        private Instant ackTimestamp;
        private String comment;
    }
}

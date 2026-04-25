package com.dematex.backend.dto;

import com.dematex.backend.model.AcknowledgementType;
import lombok.Data;

import java.time.Instant;

@Data
public class AcknowledgementPutRequest {
    private AcknowledgementType ackType;
    private String externalReference;
    private Instant ackTimestamp;
    private String comment;
}

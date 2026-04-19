package com.dematex.backend.dto;
import com.dematex.backend.model.*;
import lombok.Data;
import java.time.Instant;

@Data
public class DocumentDTO {
    private String documentId;
    private DocumentType type;
    private String entityCode;
    private String issuerCode;
    private String period;
    private AcknowledgementType status;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant deadline;
    private boolean isLate;
}

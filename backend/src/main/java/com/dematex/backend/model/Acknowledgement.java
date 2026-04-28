package com.dematex.backend.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "acknowledgements",
    indexes = {
        @Index(name = "idx_ack_document_id", columnList = "documentId"),
        @Index(name = "idx_ack_idempotency_key", columnList = "idempotencyKey")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_ack_idempotency", columnNames = {"idempotencyKey", "documentId"})
    }
)
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Acknowledgement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String documentId;
    private String entityCode;
    @Enumerated(EnumType.STRING) private AcknowledgementType type;
    private Instant timestamp;
    private String details;
    private String idempotencyKey;
    private String externalReference;
    private Instant ackTimestamp;
    private String comment;
    @PrePersist protected void onCreate() { timestamp = Instant.now(); }
}

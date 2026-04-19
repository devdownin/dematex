package com.dematex.backend.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "documents") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Document {
    @Id private String documentId;
    @Enumerated(EnumType.STRING) private DocumentType type;
    private String entityCode;
    private String issuerCode;
    private String period;
    @Enumerated(EnumType.STRING) private AcknowledgementType status;
    private Instant createdAt;
    private Instant updatedAt;
    @Lob private byte[] content;
    @PrePersist protected void onCreate() { if (createdAt == null) createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate protected void onUpdate() { updatedAt = Instant.now(); }
}

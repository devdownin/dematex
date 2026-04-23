package com.dematex.backend.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity 
@Table(name = "documents", indexes = {
    @Index(name = "idx_docs_entity", columnList = "entityCode"),
    @Index(name = "idx_docs_type", columnList = "type"),
    @Index(name = "idx_docs_period", columnList = "period"),
    @Index(name = "idx_docs_status", columnList = "status")
}) 
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Document {
    @Id private String documentId;
    @Enumerated(EnumType.STRING) private DocumentType type;
    @Enumerated(EnumType.STRING) private ClientType clientType;
    private String entityCode;
    private String issuerCode;
    private String period;
    @Enumerated(EnumType.STRING) private AcknowledgementType status;
    private String hash;
    private Instant createdAt;
    private Instant updatedAt;
    @Lob private byte[] content;

    @OneToMany(mappedBy = "documentId", fetch = FetchType.LAZY)
    @Builder.Default
    private java.util.List<Alert> alerts = new java.util.ArrayList<>();

    @PrePersist protected void onCreate() { if (createdAt == null) createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate protected void onUpdate() { updatedAt = Instant.now(); }
}

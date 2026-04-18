package com.dematex.backend.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "acknowledgements") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Acknowledgement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private String documentId;
    private String entityCode;
    @Enumerated(EnumType.STRING) private AcknowledgementType type;
    private Instant timestamp;
    private String details;
    @PrePersist protected void onCreate() { timestamp = Instant.now(); }
}

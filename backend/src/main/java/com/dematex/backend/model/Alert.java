package com.dematex.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "alerts", indexes = {
    @Index(name = "idx_alerts_resolved", columnList = "resolvedAt"),
    @Index(name = "idx_alerts_doc", columnList = "documentId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String fingerprint;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertType type;

    @Column(nullable = false, length = 64)
    private String code;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(length = 255)
    private String documentId;

    @Column(length = 64)
    private String entityCode;

    @Column(length = 64)
    private String issuerCode;

    @Column(length = 16)
    private String period;

    @Column(nullable = false)
    private Instant detectedAt;

    private Instant resolvedAt;

    @PrePersist
    protected void onCreate() {
        if (detectedAt == null) {
            detectedAt = Instant.now();
        }
    }
}

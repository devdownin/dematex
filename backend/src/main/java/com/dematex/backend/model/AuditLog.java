package com.dematex.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
        name = "audit_logs",
        indexes = {
                @Index(name = "idx_audit_logs_scope", columnList = "issuerCode, entityCode, timestamp"),
                @Index(name = "idx_audit_logs_timestamp", columnList = "timestamp")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    private Instant timestamp;
    @Column(name = "app_user") private String user;
    private String action;
    private String resource;
    private String documentId;
    private String issuerCode;
    private String entityCode;
    private String status;
    @PrePersist protected void onCreate() { timestamp = Instant.now(); }
}

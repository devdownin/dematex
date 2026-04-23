package com.dematex.backend.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    private String fullName;

    /**
     * Issuer code restricting this user's access to a single issuer directory.
     * If null, the user has access to all issuers (super-admin).
     */
    private String allowedIssuer;

    /**
     * Entity code assigned to this user.
     * If null, the user can access all entities within their allowed issuer(s).
     */
    private String legalEntityCode;

    @Column(nullable = false)
    private String role; // e.g., ROLE_USER, ROLE_ADMIN
}

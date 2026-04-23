package com.dematex.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;

@Data
@AllArgsConstructor
public class SignedDownloadLinkDTO {
    private String url;
    private Instant expiresAt;
}

package com.dematex.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class SignedDownloadService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    @Value("${downloads.signing-secret:dematex-dev-download-secret}")
    private String signingSecret;

    @Value("${downloads.link-ttl-seconds:300}")
    private long linkTtlSeconds;

    public Instant computeExpiry() {
        return Instant.now().plus(Duration.ofSeconds(linkTtlSeconds));
    }

    public String sign(String documentId, Instant expiresAt) {
        return sign(documentId, expiresAt.getEpochSecond());
    }

    public boolean isValid(String documentId, long expiresAtEpochSecond, String providedSignature) {
        if (providedSignature == null || Instant.now().isAfter(Instant.ofEpochSecond(expiresAtEpochSecond))) {
            return false;
        }
        byte[] expected = sign(documentId, expiresAtEpochSecond).getBytes(StandardCharsets.UTF_8);
        byte[] provided = providedSignature.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expected, provided);
    }

    private String sign(String documentId, long expiresAtEpochSecond) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(signingSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            byte[] digest = mac.doFinal((documentId + ":" + expiresAtEpochSecond).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to sign download URL", e);
        }
    }
}

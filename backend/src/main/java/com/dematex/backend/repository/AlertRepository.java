package com.dematex.backend.repository;

import com.dematex.backend.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByResolvedAtIsNullOrderByDetectedAtDesc();

    Optional<Alert> findByFingerprint(String fingerprint);

    List<Alert> findByFingerprintIn(Collection<String> fingerprints);
}

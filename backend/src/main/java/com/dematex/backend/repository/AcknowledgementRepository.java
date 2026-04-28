package com.dematex.backend.repository;
import com.dematex.backend.model.Acknowledgement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AcknowledgementRepository extends JpaRepository<Acknowledgement, Long> {
    List<Acknowledgement> findByDocumentIdOrderByTimestampAsc(String documentId);
    java.util.Optional<Acknowledgement> findByIdempotencyKeyAndDocumentId(String idempotencyKey, String documentId);
}

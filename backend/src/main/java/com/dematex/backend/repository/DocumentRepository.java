package com.dematex.backend.repository;
import com.dematex.backend.model.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, String> {
    @Query("SELECT d FROM Document d WHERE (:entityCode IS NULL OR d.entityCode = :entityCode) " +
           "AND (:type IS NULL OR d.type = :type) " +
           "AND (:periodStart IS NULL OR d.period >= :periodStart) " +
           "AND (:periodEnd IS NULL OR d.period <= :periodEnd) " +
           "AND (:status IS NULL OR d.status = :status) " +
           "AND (:cursor IS NULL OR d.documentId > :cursor) " +
           "AND (:lateOnly IS NULL OR :lateOnly = FALSE OR (d.status != 'AR3' AND d.createdAt < :lateThreshold)) " +
           "ORDER BY d.documentId")
    List<Document> findDocumentsWithFilters(
            @Param("entityCode") String entityCode,
            @Param("type") DocumentType type,
            @Param("periodStart") String periodStart,
            @Param("periodEnd") String periodEnd,
            @Param("status") AcknowledgementType status,
            @Param("cursor") String cursor,
            @Param("lateOnly") Boolean lateOnly,
            @Param("lateThreshold") Instant lateThreshold,
            Pageable pageable);

    List<Document> findByUpdatedAtAfterOrderByUpdatedAtAsc(Instant lastUpdate, Pageable pageable);

    long countByStatus(AcknowledgementType status);
}

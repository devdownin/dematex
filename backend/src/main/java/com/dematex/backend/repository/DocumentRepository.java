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
           "AND (:issuerCode IS NULL OR d.issuerCode = :issuerCode) " +
           "AND (:type IS NULL OR d.type = :type) " +
           "AND (:clientType IS NULL OR d.clientType = :clientType) " +
           "AND (:periodStart IS NULL OR d.period >= :periodStart) " +
           "AND (:periodEnd IS NULL OR d.period <= :periodEnd) " +
           "AND (:status IS NULL OR d.status = :status) " +
           "AND (:cursor IS NULL OR d.documentId > :cursor) " +
           "AND (:search IS NULL OR LOWER(d.documentId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(d.entityCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(d.issuerCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(d.period) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:lateOnly IS NULL OR :lateOnly = FALSE OR (d.status != 'AR3' AND d.createdAt < :lateThreshold)) " +
           "ORDER BY d.documentId")
    List<Document> findDocumentsWithFilters(
            @Param("entityCode") String entityCode,
            @Param("issuerCode") String issuerCode,
            @Param("type") DocumentType type,
            @Param("clientType") ClientType clientType,
            @Param("periodStart") String periodStart,
            @Param("periodEnd") String periodEnd,
            @Param("status") AcknowledgementType status,
            @Param("cursor") String cursor,
            @Param("search") String search,
            @Param("lateOnly") Boolean lateOnly,
            @Param("lateThreshold") Instant lateThreshold,
            Pageable pageable);

    @Query("SELECT COUNT(d) FROM Document d WHERE (:entityCode IS NULL OR d.entityCode = :entityCode) " +
           "AND (:issuerCode IS NULL OR d.issuerCode = :issuerCode) " +
           "AND (:type IS NULL OR d.type = :type) " +
           "AND (:clientType IS NULL OR d.clientType = :clientType) " +
           "AND (:periodStart IS NULL OR d.period >= :periodStart) " +
           "AND (:periodEnd IS NULL OR d.period <= :periodEnd) " +
           "AND (:status IS NULL OR d.status = :status) " +
           "AND (:search IS NULL OR LOWER(d.documentId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(d.entityCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(d.issuerCode) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(d.period) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:lateOnly IS NULL OR :lateOnly = FALSE OR (d.status != 'AR3' AND d.createdAt < :lateThreshold))")
    long countDocumentsWithFilters(
            @Param("entityCode") String entityCode,
            @Param("issuerCode") String issuerCode,
            @Param("type") DocumentType type,
            @Param("clientType") ClientType clientType,
            @Param("periodStart") String periodStart,
            @Param("periodEnd") String periodEnd,
            @Param("status") AcknowledgementType status,
            @Param("search") String search,
            @Param("lateOnly") Boolean lateOnly,
            @Param("lateThreshold") Instant lateThreshold);

    long countByStatus(AcknowledgementType status);

    long countByIssuerCode(String issuerCode);

    long countByIssuerCodeAndStatus(String issuerCode, AcknowledgementType status);

    @Query("SELECT COUNT(d) FROM Document d WHERE d.status != 'AR3' AND d.createdAt < :lateThreshold")
    long countLateDocuments(@Param("lateThreshold") Instant lateThreshold);

    @Query("SELECT COUNT(d) FROM Document d WHERE d.issuerCode = :issuerCode AND d.status != 'AR3' AND d.createdAt < :lateThreshold")
    long countLateDocumentsByIssuer(@Param("issuerCode") String issuerCode, @Param("lateThreshold") Instant lateThreshold);
}

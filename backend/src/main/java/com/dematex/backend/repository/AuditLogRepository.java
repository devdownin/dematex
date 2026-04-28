package com.dematex.backend.repository;
import com.dematex.backend.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findAllByOrderByTimestampDesc();
    List<AuditLog> findByIssuerCodeOrderByTimestampDesc(String issuerCode);
    List<AuditLog> findByIssuerCodeAndEntityCodeOrderByTimestampDesc(String issuerCode, String entityCode);

    @Query("SELECT a FROM AuditLog a WHERE (:issuerCode IS NULL OR a.issuerCode = :issuerCode) " +
           "AND (:entityCode IS NULL OR a.entityCode = :entityCode) " +
           "AND (:user IS NULL OR a.user = :user) " +
           "AND (:action IS NULL OR a.action = :action) " +
           "AND (:resource IS NULL OR LOWER(a.resource) LIKE LOWER(CONCAT('%', :resource, '%'))) " +
           "AND (:cursor IS NULL OR a.id < :cursor) " +
           "ORDER BY a.timestamp DESC, a.id DESC")
    List<AuditLog> findWithFilters(
            @Param("issuerCode") String issuerCode,
            @Param("entityCode") String entityCode,
            @Param("user") String user,
            @Param("action") String action,
            @Param("resource") String resource,
            @Param("cursor") Long cursor,
            Pageable pageable);

    @Query("SELECT COUNT(a) FROM AuditLog a WHERE (:issuerCode IS NULL OR a.issuerCode = :issuerCode) " +
           "AND (:entityCode IS NULL OR a.entityCode = :entityCode) " +
           "AND (:user IS NULL OR a.user = :user) " +
           "AND (:action IS NULL OR a.action = :action) " +
           "AND (:resource IS NULL OR LOWER(a.resource) LIKE LOWER(CONCAT('%', :resource, '%')))")
    long countWithFilters(
            @Param("issuerCode") String issuerCode,
            @Param("entityCode") String entityCode,
            @Param("user") String user,
            @Param("action") String action,
            @Param("resource") String resource);

    @Query("SELECT a FROM AuditLog a WHERE (:issuerCode IS NULL OR a.issuerCode = :issuerCode) " +
           "AND (:entityCode IS NULL OR a.entityCode = :entityCode) " +
           "AND (:user IS NULL OR a.user = :user) " +
           "AND (:action IS NULL OR a.action = :action) " +
           "AND (:resource IS NULL OR LOWER(a.resource) LIKE LOWER(CONCAT('%', :resource, '%'))) " +
           "ORDER BY a.timestamp DESC, a.id DESC")
    List<AuditLog> findAllWithFilters(
            @Param("issuerCode") String issuerCode,
            @Param("entityCode") String entityCode,
            @Param("user") String user,
            @Param("action") String action,
            @Param("resource") String resource);
}

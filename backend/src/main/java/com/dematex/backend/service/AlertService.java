package com.dematex.backend.service;

import com.dematex.backend.dto.AlertSummary;
import com.dematex.backend.model.Alert;
import com.dematex.backend.model.AlertType;
import com.dematex.backend.model.AcknowledgementType;
import com.dematex.backend.model.Document;
import com.dematex.backend.model.DocumentType;
import com.dematex.backend.repository.AlertRepository;
import com.dematex.backend.repository.AuditLogRepository;
import com.dematex.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.file.Files;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private static final Duration MISSING_AR_SLA = Duration.ofDays(2);
    private static final EnumSet<DocumentType> EXPECTED_TYPES = EnumSet.allOf(DocumentType.class);

    private final AlertRepository alertRepository;
    private final DocumentRepository documentRepository;
    private final AuditLogRepository auditLogRepository;
    private final EventService eventService;
    private final ValidationService validationService;
    private final DocumentService documentService;

    public List<Alert> getActiveAlerts(String issuerCode) {
        if (issuerCode == null) {
            return alertRepository.findByResolvedAtIsNullOrderByDetectedAtDesc();
        }
        return alertRepository.findByIssuerCodeAndResolvedAtIsNullOrderByDetectedAtDesc(issuerCode);
    }

    public AlertSummary getSummary(String issuerCode) {
        List<Alert> activeAlerts = getActiveAlerts(issuerCode);
        return AlertSummary.builder()
                .activeAlerts(activeAlerts.size())
                .documentAlerts(activeAlerts.stream().filter(alert -> alert.getDocumentId() != null).count())
                .missingArAlerts(activeAlerts.stream().filter(alert -> alert.getType() == AlertType.MISSING_AR).count())
                .missingReceptionAlerts(activeAlerts.stream().filter(alert -> alert.getType() == AlertType.MISSING_RECEPTION).count())
                .amountDiscrepancyAlerts(activeAlerts.stream().filter(alert -> alert.getType() == AlertType.AMOUNT_DISCREPANCY).count())
                .build();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initializeAlerts() {
        detectAnomalies();
    }

    @Scheduled(cron = "${alerts.detection.cron:0 0 2 * * *}")
    @Transactional
    public void detectAnomalies() {
        Instant now = Instant.now();
        List<Alert> detectedAlerts = new ArrayList<>();

        // Traitement par lots pour éviter de charger tous les documents en mémoire
        int pageSize = 1000;
        int page = 0;
        Page<Document> documentsPage;

        do {
            documentsPage = documentRepository.findAll(PageRequest.of(page++, pageSize));
            List<Document> documents = documentsPage.getContent();

            detectMissingArAlerts(documents, now, detectedAlerts);
            // Missing reception et Amount discrepancy nécessitent une vue d'ensemble par période.
            // On va collecter les données nécessaires de manière optimisée.
        } while (documentsPage.hasNext());

        // Pour les alertes croisées, on récupère uniquement les métadonnées nécessaires
        detectMissingReceptionAlerts(now, detectedAlerts);
        detectAmountDiscrepancyAlerts(now, detectedAlerts);

        synchronizeAlerts(detectedAlerts, now);
        log.info("Detection d'anomalies terminee. {} alertes actives.", detectedAlerts.size());
        eventService.broadcast("alerts-updated", Map.of("count", detectedAlerts.size(), "detectedAt", now.toString()));
    }

    private void detectMissingArAlerts(List<Document> documents, Instant now, List<Alert> detectedAlerts) {
        Instant threshold = now.minus(MISSING_AR_SLA);
        documents.stream()
                .filter(document -> document.getCreatedAt() != null)
                .filter(document -> document.getCreatedAt().isBefore(threshold))
                .filter(document -> document.getStatus() != AcknowledgementType.AR3)
                .map(document -> buildAlert(
                        fingerprint(AlertType.MISSING_AR, document.getDocumentId()),
                        AlertType.MISSING_AR,
                        "ALT-AR-J2",
                        "Absence d'AR a J+2",
                        "Le document " + document.getDocumentId() + " n'a pas atteint le statut AR3 dans le delai de 2 jours.",
                        document.getDocumentId(),
                        document.getEntityCode(),
                        document.getIssuerCode(),
                        document.getPeriod(),
                        now))
                .forEach(detectedAlerts::add);
    }

    private void detectMissingReceptionAlerts(Instant now, List<Alert> detectedAlerts) {
        // On pourrait optimiser via une requête agrégée SQL, mais on garde la logique métier ici
        List<Document> documents = documentRepository.findAll(); // Idéalement, limiter aux 3 derniers mois

        Map<PeriodScope, Set<DocumentType>> typesByScope = documents.stream()
                .filter(document -> document.getEntityCode() != null && document.getPeriod() != null)
                .collect(Collectors.groupingBy(
                        document -> new PeriodScope(document.getEntityCode(), document.getIssuerCode(), document.getPeriod()),
                        Collectors.mapping(Document::getType, Collectors.toSet())));

        for (Map.Entry<PeriodScope, Set<DocumentType>> entry : typesByScope.entrySet()) {
            PeriodScope scope = entry.getKey();
            EnumSet<DocumentType> missingTypes = EnumSet.copyOf(EXPECTED_TYPES);
            missingTypes.removeAll(entry.getValue());
            for (DocumentType missingType : missingTypes) {
                detectedAlerts.add(buildAlert(
                        fingerprint(AlertType.MISSING_RECEPTION, scope.entityCode(), scope.period(), missingType.name()),
                        AlertType.MISSING_RECEPTION,
                        "ALT-REC-" + missingType.name(),
                        "Absence de reception " + missingType.name(),
                        "Aucun fichier " + missingType.name() + " recu pour l'entite " + scope.entityCode() + " sur la periode " + scope.period() + ".",
                        null,
                        scope.entityCode(),
                        scope.issuerCode(),
                        scope.period(),
                        now));
            }
        }
    }

    private void detectAmountDiscrepancyAlerts(Instant now, List<Alert> detectedAlerts) {
        List<Document> documents = documentRepository.findAll(); // Idéalement, filtrer sur les périodes non clôturées

        Map<PeriodScope, List<Document>> documentsByScope = documents.stream()
                .filter(document -> document.getEntityCode() != null && document.getPeriod() != null)
                .collect(Collectors.groupingBy(document -> new PeriodScope(document.getEntityCode(), document.getIssuerCode(), document.getPeriod())));

        for (Map.Entry<PeriodScope, List<Document>> entry : documentsByScope.entrySet()) {
            PeriodScope scope = entry.getKey();
            List<Document> scopeDocs = entry.getValue();
            
            Optional<Document> crmensDoc = scopeDocs.stream().filter(d -> d.getType() == DocumentType.CRMENS).findFirst();
            List<Document> vtisDocs = scopeDocs.stream().filter(d -> d.getType() == DocumentType.VTIS).toList();

            if (vtisDocs.isEmpty() && crmensDoc.isEmpty()) continue;

            if (crmensDoc.isEmpty()) {
                detectedAlerts.add(buildAlert(
                        fingerprint(AlertType.AMOUNT_DISCREPANCY, scope.entityCode(), scope.period(), "NO_CRMENS"),
                        AlertType.AMOUNT_DISCREPANCY,
                        "ALT-AMT-CRMENS",
                        "Absence de CRMENS de reference",
                        "Des flux VTIS existent sans CRMENS pour l'entite " + scope.entityCode() + " sur la periode " + scope.period() + ".",
                        null, scope.entityCode(), scope.issuerCode(), scope.period(), now));
                continue;
            }

            try {
                // Reconciliation CRMENS vs VTIS
                ValidationService.CrmensContent crmens;
                try (InputStream is = documentService.getFileAsResource(crmensDoc.get().getDocumentId()).getInputStream()) {
                    crmens = validationService.parseCrmens(is);
                }
                
                java.math.BigDecimal totalVtis = java.math.BigDecimal.ZERO;
                for (Document vtisDoc : vtisDocs) {
                    try (InputStream is = documentService.getFileAsResource(vtisDoc.getDocumentId()).getInputStream()) {
                        ValidationService.VtisContent vtis = validationService.parseVtis(is);
                        totalVtis = totalVtis.add(vtis.getTotal());
                    }
                }

                if (crmens.getTotalTtc().compareTo(totalVtis) != 0) {
                    detectedAlerts.add(buildAlert(
                            fingerprint(AlertType.AMOUNT_DISCREPANCY, scope.entityCode(), scope.period(), "VTIS_MISMATCH"),
                            AlertType.AMOUNT_DISCREPANCY,
                            "ALT-AMT-VTIS-MISMATCH",
                            "Ecart de montants VTIS vs CRMENS",
                            String.format("Le total VTIS (%s) ne correspond pas au montant CRMENS (%s) pour l'entite %s.", 
                                    totalVtis, crmens.getTotalTtc(), scope.entityCode()),
                            null, scope.entityCode(), scope.issuerCode(), scope.period(), now));
                }

                // Reconciliation FTIS (Factures) vs CRMENS / PTIS (Paiements)
                List<Document> ftisDocs = scopeDocs.stream().filter(d -> d.getType() == DocumentType.FTIS).toList();
                List<Document> ptisDocs = scopeDocs.stream().filter(d -> d.getType() == DocumentType.PTIS).toList();

                Map<String, java.math.BigDecimal> invoiceBalances = new HashMap<>();

                for (Document ftisDoc : ftisDocs) {
                    try (InputStream is = documentService.getFileAsResource(ftisDoc.getDocumentId()).getInputStream()) {
                        ValidationService.FtisContent ftis = validationService.parseFtis(is);
                        for (ValidationService.FtisContent.Invoice invoice : ftis.getInvoices()) {
                            invoiceBalances.put(invoice.getId(), invoice.getAmountTtc());
                        }
                    }
                }

                for (Document ptisDoc : ptisDocs) {
                    try (InputStream is = documentService.getFileAsResource(ptisDoc.getDocumentId()).getInputStream()) {
                        ValidationService.PtisContent ptis = validationService.parsePtis(is);
                        for (ValidationService.PtisContent.Payment payment : ptis.getPayments()) {
                            if (invoiceBalances.containsKey(payment.getInvoiceId())) {
                                java.math.BigDecimal currentBalance = invoiceBalances.get(payment.getInvoiceId());
                                invoiceBalances.put(payment.getInvoiceId(), currentBalance.subtract(payment.getAmount()));
                            }
                        }
                    }
                }

                // Alerte si solde facture négatif (sur-paiement)
                for (Map.Entry<String, java.math.BigDecimal> balanceEntry : invoiceBalances.entrySet()) {
                    if (balanceEntry.getValue().compareTo(java.math.BigDecimal.ZERO) < 0) {
                        detectedAlerts.add(buildAlert(
                                fingerprint(AlertType.AMOUNT_DISCREPANCY, scope.entityCode(), scope.period(), "OVERPAYMENT", balanceEntry.getKey()),
                                AlertType.AMOUNT_DISCREPANCY,
                                "ALT-AMT-OVERPAYMENT",
                                "Sur-paiement detecte",
                                String.format("La facture %s a un solde negatif (%s) pour l'entite %s.", 
                                        balanceEntry.getKey(), balanceEntry.getValue(), scope.entityCode()),
                                null, scope.entityCode(), scope.issuerCode(), scope.period(), now));
                    }
                }
            } catch (Exception e) {
                log.error("Erreur lors de la reconciliation des montants pour {} - {}", scope.entityCode(), scope.period(), e);
            }
        }
    }

    private void synchronizeAlerts(List<Alert> detectedAlerts, Instant now) {
        Map<String, Alert> detectedByFingerprint = detectedAlerts.stream()
                .collect(Collectors.toMap(Alert::getFingerprint, Function.identity(), (left, right) -> left, LinkedHashMap::new));
        List<Alert> existingActiveAlerts = alertRepository.findByResolvedAtIsNullOrderByDetectedAtDesc();

        List<Alert> toSave = new ArrayList<>();
        for (Alert detected : detectedByFingerprint.values()) {
            boolean exists = existingActiveAlerts.stream().anyMatch(existing -> existing.getFingerprint().equals(detected.getFingerprint()));
            if (!exists) {
                toSave.add(detected);
                auditLogRepository.save(com.dematex.backend.model.AuditLog.builder()
                        .user("system")
                        .action("DETECT_ALARM")
                        .resource(detected.getType().name())
                        .documentId(detected.getDocumentId())
                        .issuerCode(detected.getIssuerCode())
                        .entityCode(detected.getEntityCode())
                        .status("ACTIVE")
                        .build());
            }
        }

        for (Alert existing : existingActiveAlerts) {
            if (!detectedByFingerprint.containsKey(existing.getFingerprint())) {
                existing.setResolvedAt(now);
                toSave.add(existing);
                auditLogRepository.save(com.dematex.backend.model.AuditLog.builder()
                        .user("system")
                        .action("RESOLVE_ALARM")
                        .resource(existing.getType().name())
                        .documentId(existing.getDocumentId())
                        .issuerCode(existing.getIssuerCode())
                        .entityCode(existing.getEntityCode())
                        .status("RESOLVED")
                        .build());
            }
        }

        if (!toSave.isEmpty()) {
            alertRepository.saveAll(toSave);
        }
    }

    private Alert buildAlert(String fingerprint, AlertType type, String code, String title, String message, String documentId,
                             String entityCode, String issuerCode, String period, Instant detectedAt) {
        return Alert.builder()
                .fingerprint(fingerprint)
                .type(type)
                .code(code)
                .title(title)
                .message(message)
                .documentId(documentId)
                .entityCode(entityCode)
                .issuerCode(issuerCode)
                .period(period)
                .detectedAt(detectedAt)
                .build();
    }

    private String fingerprint(AlertType type, String... parts) {
        return type.name() + "::" + String.join("::", Arrays.stream(parts).filter(Objects::nonNull).toList());
    }

    private record PeriodScope(String entityCode, String issuerCode, String period) {}
}

package com.dematex.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AlertSummary {
    private long activeAlerts;
    private long documentAlerts;
    private long missingArAlerts;
    private long missingReceptionAlerts;
    private long amountDiscrepancyAlerts;
}

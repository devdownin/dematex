package com.dematex.backend.dto;
import lombok.Builder;
import lombok.Data;

@Data @Builder
public class DashboardStats {
    private long totalDocuments;
    private long ar3Completed;
    private long ar3Pending;
    private double ar3CompletionRate;
}

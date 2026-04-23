package com.dematex.backend.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data @AllArgsConstructor
public class PaginatedResponse<T> {
    private List<T> items;
    private String nextCursor;
    private boolean hasMore;
    private long totalCount;
}

package com.dematex.backend.exception;

import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.time.Instant;
import java.util.UUID;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final String ERROR_TYPE_BASE = "https://api.dematex.fr/errors/";

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex, WebRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, "error.resource_not_found", ex.getMessage(), request);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex, WebRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST, "error.business_rule", ex.getMessage(), request);
    }

    @ExceptionHandler(AckAlreadyAppliedException.class)
    public ResponseEntity<ErrorResponse> handleAckAlreadyApplied(AckAlreadyAppliedException ex, WebRequest request) {
        return buildResponse(HttpStatus.CONFLICT, "error.ack_already_applied", ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidAckTransitionException.class)
    public ResponseEntity<ErrorResponse> handleInvalidAckTransition(InvalidAckTransitionException ex, WebRequest request) {
        return buildResponse(HttpStatus.UNPROCESSABLE_ENTITY, "error.invalid_state_transition", ex.getMessage(), request);
    }

    @ExceptionHandler(StorageException.class)
    public ResponseEntity<ErrorResponse> handleStorageException(StorageException ex, WebRequest request) {
        log.error("Storage error: {}", ex.getMessage(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "error.storage_access", "Storage access error", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex, WebRequest request) {
        return buildResponse(HttpStatus.FORBIDDEN, "error.access_denied", ex.getMessage(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleAllExceptions(Exception ex, WebRequest request) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "error.internal_server", "An internal server error occurred", request);
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String code, String message, WebRequest request) {
        String path = request.getDescription(false).replace("uri=", "");
        String correlationId = UUID.randomUUID().toString();
        ErrorResponse error = ErrorResponse.builder()
                .type(ERROR_TYPE_BASE + code)
                .title(status.getReasonPhrase())
                .status(status.value())
                .detail(message)
                .instance(path)
                .code(code)
                .correlationId(correlationId)
                .timestamp(Instant.now())
                .error(status.getReasonPhrase())
                .message(message)
                .path(path)
                .build();
        return new ResponseEntity<>(error, status);
    }

    @Data @Builder
    public static class ErrorResponse {
        // RFC 7807 fields
        private String type;
        private String title;
        private int status;
        private String detail;
        private String instance;
        private String code;
        private String correlationId;
        private Instant timestamp;
        // Legacy portal fields (backward compat)
        private String error;
        private String message;
        private String path;
    }
}

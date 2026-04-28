package com.dematex.backend.exception;

import com.dematex.backend.model.AcknowledgementType;

public class AckAlreadyAppliedException extends RuntimeException {
    private final String documentId;
    private final AcknowledgementType appliedType;

    public AckAlreadyAppliedException(String documentId, AcknowledgementType appliedType) {
        super("L'accusé de réception " + appliedType + " a déjà été appliqué au document " + documentId);
        this.documentId = documentId;
        this.appliedType = appliedType;
    }

    public String getDocumentId() { return documentId; }
    public AcknowledgementType getAppliedType() { return appliedType; }
}

package com.dematex.backend.exception;

import com.dematex.backend.model.AcknowledgementType;
import java.util.Set;

public class InvalidAckTransitionException extends RuntimeException {
    private final AcknowledgementType currentStatus;
    private final AcknowledgementType requestedType;
    private final Set<AcknowledgementType> allowedTransitions;

    public InvalidAckTransitionException(AcknowledgementType currentStatus, AcknowledgementType requestedType, Set<AcknowledgementType> allowedTransitions) {
        super("Transition AR invalide : " + currentStatus + " -> " + requestedType + ". Transitions autorisées depuis " + currentStatus + " : " + allowedTransitions);
        this.currentStatus = currentStatus;
        this.requestedType = requestedType;
        this.allowedTransitions = allowedTransitions;
    }

    public AcknowledgementType getCurrentStatus() { return currentStatus; }
    public AcknowledgementType getRequestedType() { return requestedType; }
    public Set<AcknowledgementType> getAllowedTransitions() { return allowedTransitions; }
}

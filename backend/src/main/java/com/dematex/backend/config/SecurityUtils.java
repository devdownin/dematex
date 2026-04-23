package com.dematex.backend.config;

import com.dematex.backend.model.User;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    public User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }
        throw new AccessDeniedException("Utilisateur non authentifié");
    }

    public String getEffectiveIssuer() {
        return getCurrentUser().getAllowedIssuer();
    }

    public void checkEntityAccess(String entityCode) {
        User user = getCurrentUser();
        if (user.getLegalEntityCode() != null && !user.getLegalEntityCode().equals(entityCode)) {
            throw new AccessDeniedException("Accès refusé à l'entité " + entityCode);
        }
    }

    public void checkIssuerAccess(String issuerCode) {
        User user = getCurrentUser();
        if (user.getAllowedIssuer() != null && !user.getAllowedIssuer().equals(issuerCode)) {
            throw new AccessDeniedException("Accès refusé à l'émetteur " + issuerCode);
        }
    }
}

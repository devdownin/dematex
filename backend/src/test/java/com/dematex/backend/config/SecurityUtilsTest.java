package com.dematex.backend.config;

import com.dematex.backend.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.*;

class SecurityUtilsTest {

    private final SecurityUtils securityUtils = new SecurityUtils();

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getCurrentUser_returnsAuthenticatedUser() {
        User user = User.builder().username("test").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));

        assertEquals(user, securityUtils.getCurrentUser());
    }

    @Test
    void getCurrentUser_throwsWhenNotAuthenticated() {
        assertThrows(AccessDeniedException.class, securityUtils::getCurrentUser);
    }

    @Test
    void getEffectiveIssuer_returnsUserIssuer() {
        User user = User.builder().allowedIssuer("Indigo").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));

        assertEquals("Indigo", securityUtils.getEffectiveIssuer());
    }

    @Test
    void checkEntityAccess_throwsWhenEntityMismatch() {
        User user = User.builder().legalEntityCode("ENT1").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));

        assertDoesNotThrow(() -> securityUtils.checkEntityAccess("ENT1"));
        assertThrows(AccessDeniedException.class, () -> securityUtils.checkEntityAccess("ENT2"));
    }

    @Test
    void checkIssuerAccess_throwsWhenIssuerMismatch() {
        User user = User.builder().allowedIssuer("Indigo").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));

        assertDoesNotThrow(() -> securityUtils.checkIssuerAccess("Indigo"));
        assertThrows(AccessDeniedException.class, () -> securityUtils.checkIssuerAccess("Other"));
    }
}

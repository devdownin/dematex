package com.dematex.backend.service;

import com.dematex.backend.model.User;
import com.dematex.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .username("testuser")
                .password("password")
                .fullName("Test User")
                .role("ROLE_USER")
                .build();
    }

    @Test
    void login_withValidCredentials_returnsToken() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        Optional<String> token = authService.login("testuser", "password");

        assertTrue(token.isPresent());
        assertTrue(authService.getUserByToken(token.get()).isPresent());
        assertEquals("testuser", authService.getUserByToken(token.get()).get().getUsername());
    }

    @Test
    void login_withInvalidPassword_returnsEmpty() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        Optional<String> token = authService.login("testuser", "wrongpassword");

        assertTrue(token.isEmpty());
    }

    @Test
    void login_withInvalidUsername_returnsEmpty() {
        when(userRepository.findByUsername("wronguser")).thenReturn(Optional.empty());

        Optional<String> token = authService.login("wronguser", "password");

        assertTrue(token.isEmpty());
    }

    @Test
    void getUserByToken_withValidToken_returnsUser() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        String token = authService.login("testuser", "password").get();

        Optional<User> user = authService.getUserByToken(token);

        assertTrue(user.isPresent());
        assertEquals("testuser", user.get().getUsername());
    }

    @Test
    void logout_removesSession() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        String token = authService.login("testuser", "password").get();

        authService.logout(token);

        assertTrue(authService.getUserByToken(token).isEmpty());
    }
}

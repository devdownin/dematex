package com.dematex.backend.controller;

import com.dematex.backend.model.User;
import com.dematex.backend.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.junit.jupiter.api.BeforeEach;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class AuthControllerTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @MockitoBean
    private AuthService authService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @Test
    void login_withValidCredentials_returnsToken() throws Exception {
        when(authService.login("VAUT", "VAUT")).thenReturn(Optional.of("dummy-token"));

        AuthController.LoginRequest request = new AuthController.LoginRequest();
        request.setUsername("VAUT");
        request.setPassword("VAUT");

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("dummy-token"));
    }

    @Test
    void login_withInvalidCredentials_returns401() throws Exception {
        when(authService.login(anyString(), anyString())).thenReturn(Optional.empty());

        AuthController.LoginRequest request = new AuthController.LoginRequest();
        request.setUsername("wrong");
        request.setPassword("wrong");

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_withValidToken_returnsUser() throws Exception {
        User user = User.builder()
                .username("VAUT")
                .fullName("Admin")
                .role("ROLE_ADMIN")
                .build();
        when(authService.getUserByToken("valid-token")).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("VAUT"))
                .andExpect(jsonPath("$.fullName").value("Admin"));
    }

    @Test
    void me_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_returnsOk() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                .header("Authorization", "Bearer some-token"))
                .andExpect(status().isOk());
    }

    @Test
    void getProfiles_returnsList() throws Exception {
        mockMvc.perform(get("/api/v1/auth/profiles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}

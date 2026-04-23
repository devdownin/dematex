package com.dematex.backend.service;

import com.dematex.backend.model.User;
import com.dematex.backend.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;

    // In-memory sessions for simplicity in this prototype
    private final ConcurrentHashMap<String, User> sessions = new ConcurrentHashMap<>();

    @PostConstruct
    public void initDemoUsers() {
        if (userRepository.count() == 0) {
            userRepository.save(User.builder()
                    .username("VAUT")
                    .password("VAUT")
                    .fullName("Administrateur VAUT")
                    .role("ROLE_ADMIN")
                    .allowedIssuer(null)    // Super-admin: accès à tous les issuers
                    .legalEntityCode(null)
                    .build());

            userRepository.save(User.builder()
                    .username("Indigo")
                    .password("Indigo")
                    .fullName("Utilisateur Indigo")
                    .role("ROLE_USER")
                    .allowedIssuer("Indigo")
                    .legalEntityCode(null)
                    .build());

            userRepository.save(User.builder()
                    .username("REORA")
                    .password("REORA")
                    .fullName("Utilisateur REORA")
                    .role("ROLE_USER")
                    .allowedIssuer("REORA")
                    .legalEntityCode(null)
                    .build());

            userRepository.save(User.builder()
                    .username("REPA")
                    .password("REPA")
                    .fullName("Utilisateur REPA")
                    .role("ROLE_USER")
                    .allowedIssuer("REPA")
                    .legalEntityCode(null)
                    .build());

            log.info("Demo users initialized: VAUT (admin), Indigo, REORA, REPA");
        }
    }

    public Optional<String> login(String username, String password) {
        return userRepository.findByUsername(username)
                .filter(user -> user.getPassword().equals(password))
                .map(user -> {
                    String token = UUID.randomUUID().toString();
                    sessions.put(token, user);
                    return token;
                });
    }

    public Optional<User> getUserByToken(String token) {
        return Optional.ofNullable(sessions.get(token));
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public void logout(String token) {
        sessions.remove(token);
    }
}

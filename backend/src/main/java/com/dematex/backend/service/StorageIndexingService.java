package com.dematex.backend.service;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardWatchEventKinds;
import java.nio.file.WatchEvent;
import java.nio.file.WatchKey;
import java.nio.file.WatchService;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageIndexingService {

    private final DocumentService documentService;

    @Value("${storage.root:./regulatory_files}")
    private String storageRoot;

    @Value("${storage.watch.enabled:true}")
    private boolean watchEnabled;

    @Value("${storage.watch.debounce-ms:750}")
    private long debounceMs;

    private final Map<WatchKey, Path> watchKeys = new ConcurrentHashMap<>();
    private final Set<Path> pendingPaths = ConcurrentHashMap.newKeySet();
    private final AtomicBoolean flushScheduled = new AtomicBoolean(false);
    private final AtomicBoolean fullResyncRequested = new AtomicBoolean(false);
    private final AtomicBoolean running = new AtomicBoolean(false);

    private final ExecutorService watchExecutor = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "storage-watch-loop");
        thread.setDaemon(true);
        return thread;
    });

    private final ScheduledExecutorService debounceExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread thread = new Thread(r, "storage-watch-debounce");
        thread.setDaemon(true);
        return thread;
    });

    private volatile WatchService watchService;

    @EventListener(ApplicationReadyEvent.class)
    public void initializeIndexing() {
        documentService.syncFileSystemToIndex();
        if (!watchEnabled) {
            log.info("Watch filesystem désactivé. Synchronisation incrémentale inactive.");
            return;
        }

        Path root = getStorageRootPath();
        if (!Files.isDirectory(root)) {
            log.warn("Racine de stockage absente, watcher non démarré: {}", root);
            return;
        }

        try {
            watchService = FileSystems.getDefault().newWatchService();
            registerRecursively(root);
            running.set(true);
            watchExecutor.submit(this::watchLoop);
            log.info("Watch filesystem démarré sur {}", root);
        } catch (IOException e) {
            throw new IllegalStateException("Impossible de démarrer le watcher filesystem", e);
        }
    }

    @PreDestroy
    public void shutdown() {
        running.set(false);
        if (watchService != null) {
            try {
                watchService.close();
            } catch (IOException e) {
                log.debug("Erreur à la fermeture du watcher", e);
            }
        }
        watchExecutor.shutdownNow();
        debounceExecutor.shutdownNow();
    }

    private void watchLoop() {
        while (running.get()) {
            WatchKey key;
            try {
                key = watchService.take();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                if (running.get()) {
                    log.error("Boucle watcher interrompue", e);
                }
                return;
            }

            Path watchedDir = watchKeys.get(key);
            if (watchedDir == null) {
                key.reset();
                continue;
            }

            for (WatchEvent<?> event : key.pollEvents()) {
                WatchEvent.Kind<?> kind = event.kind();
                if (kind == StandardWatchEventKinds.OVERFLOW) {
                    fullResyncRequested.set(true);
                    scheduleFlush();
                    continue;
                }

                Path child = watchedDir.resolve((Path) event.context()).toAbsolutePath().normalize();
                if (kind == StandardWatchEventKinds.ENTRY_CREATE) {
                    tryRegisterDirectory(child);
                }
                pendingPaths.add(child);
                scheduleFlush();
            }

            if (!key.reset()) {
                watchKeys.remove(key);
            }
        }
    }

    private void scheduleFlush() {
        if (!flushScheduled.compareAndSet(false, true)) {
            return;
        }

        debounceExecutor.schedule(() -> {
            flushScheduled.set(false);
            flushPendingPaths();
        }, debounceMs, TimeUnit.MILLISECONDS);
    }

    private void flushPendingPaths() {
        try {
            if (fullResyncRequested.compareAndSet(true, false)) {
                pendingPaths.clear();
                documentService.syncFileSystemToIndex();
                return;
            }

            List<Path> paths = new ArrayList<>(pendingPaths);
            pendingPaths.removeAll(paths);
            for (Path path : reduceToMinimalScopes(paths)) {
                documentService.syncAffectedPath(path);
            }
        } catch (Exception e) {
            log.error("Erreur pendant la synchronisation incrémentale déclenchée par watcher", e);
        }
    }

    private void registerRecursively(Path start) throws IOException {
        Files.walk(start)
                .filter(Files::isDirectory)
                .forEach(path -> {
                    try {
                        WatchKey key = path.register(
                                watchService,
                                StandardWatchEventKinds.ENTRY_CREATE,
                                StandardWatchEventKinds.ENTRY_DELETE,
                                StandardWatchEventKinds.ENTRY_MODIFY);
                        watchKeys.put(key, path.toAbsolutePath().normalize());
                    } catch (IOException e) {
                        throw new IllegalStateException("Impossible d'enregistrer le répertoire " + path, e);
                    }
                });
    }

    private void tryRegisterDirectory(Path directory) {
        if (!Files.isDirectory(directory)) {
            return;
        }
        try {
            registerRecursively(directory);
        } catch (Exception e) {
            log.warn("Impossible d'enregistrer le nouveau répertoire {}", directory, e);
        }
    }

    private List<Path> reduceToMinimalScopes(List<Path> paths) {
        List<Path> normalized = paths.stream()
                .map(path -> path.toAbsolutePath().normalize())
                .distinct()
                .sorted((left, right) -> Integer.compare(left.getNameCount(), right.getNameCount()))
                .toList();

        List<Path> reduced = new ArrayList<>();
        for (Path candidate : normalized) {
            boolean covered = reduced.stream().anyMatch(existing -> candidate.startsWith(existing));
            if (!covered) {
                reduced.add(candidate);
            }
        }
        return reduced;
    }

    private Path getStorageRootPath() {
        return Path.of(storageRoot).toAbsolutePath().normalize();
    }
}

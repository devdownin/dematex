package com.dematex.backend.repository;

import com.dematex.backend.model.PortalConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PortalConfigRepository extends JpaRepository<PortalConfig, String> {
}

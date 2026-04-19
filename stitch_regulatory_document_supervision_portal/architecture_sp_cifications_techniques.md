# Spécifications Techniques : Guichet Unique de Dématérialisation

## 1. Architecture Logicielle
L'application repose sur un modèle **BFF (Backend For Frontend)** pour assurer une séparation stricte entre l'exposition des données et l'interface utilisateur.

*   **Backend :** Java 21 / Spring Boot 3.2+
*   **Frontend :** Angular 17+ / Angular Material
*   **Sécurité :** OAuth2/OIDC avec filtrage par `entityCode`.
*   **Flux :** Intégration optimisée pour ETL via Cursor-based pagination et API Delta.

## 2. Modèle de Données (Entités Clés)
*   **Document :** `documentId`, `type` (VTIS, FTIS, PTIS, REFERENTIEL), `entityCode`, `issuerCode`, `period`, `status`.
*   **Acknowledgement (AR) :** `arId`, `documentId`, `type` (AR-0, AR-2, AR-3, AR-4), `timestamp`, `status`, `payload`.
*   **AuditLog :** `logId`, `userId`, `action`, `documentId`, `timestamp`, `correlationId`.

## 3. Stratégie API & Performance
*   **Cursor-based Pagination :** Indispensable pour l'ETL afin d'éviter les problèmes de performance du `OFFSET`.
*   **API Delta :** Utilisation d'un `lastUpdate` timestamp pour la synchronisation incrémentale.
*   **Idempotence :** Clés d'idempotence pour les POST d'AR afin de garantir la sécurité des retries ETL.

## 4. Expérience Utilisateur (UX)
L'UI est conçue pour la densité d'information et la rapidité d'action.
*   **DataGrid :** Utilisation du virtual scrolling pour gérer des milliers de lignes sans latence.
*   **Visuels :** Code couleur strict pour les AR, avec emphase sur l'AR-3 (preuve juridique).

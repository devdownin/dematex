# Modèles C4 - Projet Dematex

Ce document présente l'architecture du Guichet Unique de Dématérialisation (Dematex) selon la méthodologie C4.

## 1. Niveau 2 : Diagramme de Conteneurs

Le diagramme de conteneurs montre la structure de haut niveau de l'application logicielle.

```mermaid
graph TB
    subgraph "Système Dematex"
        UI[Angular Frontend\n'SPA, TypeScript']
        API[Backend API\n'Spring Boot, Java']
        DB[(Index JPA\n'H2 / PostgreSQL')]
        FS[[FileSystem Storage\n'Source de Vérité']]
    end

    User((Utilisateur Métier))
    ETL[Système ETL Externe]

    User -- "Consulte les documents" --> UI
    UI -- "Appels API (REST/JSON)" --> API
    API -- "Requêtes Index" --> DB
    API -- "Lecture/Ecriture Fichiers" --> FS
    ETL -- "Dépôt de fichiers" --> FS
    API -- "Watch Events" --> FS
    ETL -- "Consomme API Delivery" --> API
```

## 2. Niveau 3 : Diagramme de Composants (Backend)

Ce diagramme détaille les composants internes du conteneur **Backend API**.

```mermaid
graph TB
    subgraph "Backend API"
        subgraph "Controllers"
            DocCtrl[DocumentController\n'Endpoints REST']
            AuthCtrl[AuthController\n'Sécurité']
        end

        subgraph "Services"
            DocService[DocumentService\n'Logique métier AR']
            SyncService[StorageIndexingService\n'Watch filesystem']
            AuthService[AuthService\n'Gestion JWT']
        end

        subgraph "Repositories"
            DocRepo[DocumentRepository\n'Accès Index JPA']
            AuditRepo[AuditLogRepository\n'Traçabilité']
        end
    end

    UI[Angular Frontend] -- "HTTP Request" --> DocCtrl
    DocCtrl --> DocService
    DocService --> DocRepo
    DocService --> AuditRepo
    
    SyncService -- "Trigger Sync" --> DocService
    DocService -- "Renommer / Lire" --> FS[[FileSystem]]
    DocRepo -- "CRUD" --> DB[(Database)]
```

## 3. Niveau 3 : Diagramme de Composants (Frontend)

Ce diagramme détaille les composants internes du conteneur **Angular Frontend**.

```mermaid
graph TB
    subgraph "Angular Frontend"
        subgraph "Components"
            Dashboard[DashboardComponent\n'Bento Grid']
            DocList[DocumentListComponent\n'Listing/Filtres']
            DocDetail[DocumentDetailComponent\n'Timeline AR']
        end

        subgraph "Services"
            DocData[DocumentService\n'Appels API']
            AuthData[AuthService\n'Session']
        end
    end

    User((Utilisateur)) -- "Interagit" --> Dashboard
    Dashboard --> DocData
    DocList --> DocData
    DocDetail --> DocData
    DocData -- "REST" --> API[Backend API]
```

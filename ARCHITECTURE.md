# Architecture du Guichet Unique de Dématérialisation

Ce document décrit les choix d'architecture et les flux de données du portail Dematex.

## 1. Vue d'Ensemble

L'application est conçue comme une couche de **Supervision et d'Audit** au-dessus de flux documentaires industriels. Elle ne réalise pas de traitement métier lourd mais expose l'état réel des documents stockés physiquement.

## 2. Stratégie de Stockage Hybride

L'une des particularités du système est sa gestion du stockage :

- **FileSystem (Source de Vérité)** : Les documents sont organisés dans une hiérarchie `Destinataire / Entité / Type / Fichier`. Le statut du document est porté par son **extension** (ex: `.ALIRE` pour initial, `.AR3` pour preuve juridique).
- **Index JPA (Performance)** : Pour garantir des performances de listing et de recherche compatibles avec l'industrie, un index léger (H2/PostgreSQL) est maintenu.
- **Synchronisation** : Un service d'arrière-plan synchronise périodiquement (toutes les minutes) l'état du filesystem vers l'index JPA.

## 3. Flux de Données

1. **Découverte (ETL/API)** : L'ETL consomme l'API Delta ou Listing pour découvrir les nouveaux documents.
2. **Consultation (UI)** : L'utilisateur accède au tableau de bord. Le frontend Angular appelle les APIs du backend Spring Boot.
3. **Accusé de Réception** : Lors d'une validation (AR), le backend renomme le fichier sur le disque. Le changement d'extension déclenche la mise à jour du statut dans l'index.

## 4. Gestion du SLA

Le système calcule dynamiquement le respect des délais :
- **Règle** : Un document doit atteindre le statut `AR3` sous 2 jours.
- **Visualisation** : Les dépassements sont calculés à la volée par le backend et visualisés sur le dashboard via des alertes et des graphiques de distribution.

## 5. Sécurité

- **Traçabilité** : Chaque requête porte un `correlationId` propagé des logs backend vers les en-têtes de réponse.
- **Hardening** : Utilisation des en-têtes standard `Content-Security-Policy`, `Referrer-Policy` et `HSTS`.

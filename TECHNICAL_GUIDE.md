# Guide Technique et Maintenance

## Stack Technique

- **Backend** : Java 21, Spring Boot 3.4, Spring Data JPA, Spring Security, Spring Retry, Caffeine.
- **Frontend** : Angular 21, Tailwind CSS v4, Chart.js.
- **Build** : Maven & NPM (PostCSS v8+).

## Maintenance du Backend

### Ajout d'un type de document
1. Modifier l'enum `DocumentType` dans `com.dematex.backend.model`.
2. S'assurer que le script `setup_folders.sh` inclut ce nouveau type pour les tests.

### Modification de la règle SLA
La constante `AR3_SLA` dans `DocumentService.java` définit le délai (actuellement 2 jours).

### Caching
Le cache des statistiques (`stats`) est géré par Caffeine. Il est automatiquement invalidé à chaque synchronisation du filesystem vers l'index.

## Maintenance du Frontend

### Mise à jour des graphiques
Les composants utilisent `ng2-charts`. Pour modifier les couleurs ou les types de graphiques, éditer `dashboard.component.ts`. Le dashboard utilise également Chart.js pour l'analyse de latence.

### Système de Design (Tailwind CSS v4)
Le projet utilise Tailwind CSS v4. La configuration globale du thème se trouve dans `frontend/src/styles.scss` via le bloc `@theme`. Toute modification des couleurs de marque ou des polices doit être effectuée à cet endroit.

### Gestion des routes
Les routes sont définies dans `app.routes.ts`. L'architecture utilise des composants Standalone.

## Déploiement

Le projet est "Docker-ready".
```bash
docker-compose up --build
```
Les fichiers réglementaires doivent être montés dans le volume `/app/regulatory_files`.

## Personnalisation (Branding)

Le portail peut être personnalisé via `application.properties` (ou variables d'environnement) :

- `portal.company-name` : Nom de l'entreprise affiché dans le header.
- `portal.logo-url` : URL du logo (format SVG recommandé).
- `portal.primary-color` : Couleur principale de l'interface (code hexadécimal).
- `portal.support-email` : Email de contact pour le support.

Exemple en Docker :
```yaml
environment:
  - PORTAL_COMPANY_NAME=MaBanque Digitale
  - PORTAL_PRIMARY_COLOR=#e91e63
```

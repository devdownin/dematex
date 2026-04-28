# MACI/SRESEAUX - Portail de Diffusion de Documents Réglementaires

Professional Single Window for Dematerialization, serving as a portal for consultation, diffusion, and audit of regulatory document flows.

## Architecture

The system is designed for high-volumetry industrial ETL integration.

- **Backend**: Java 21, Spring Boot 3, REST APIs with cursor-based pagination.
- **Frontend**: Angular 21, Tailwind CSS v4, SaaS Enterprise UX (High-Fidelity).
- **Storage**: Physical filesystem-based discovery with status management via file extensions.

## Key Features

- **Operational Dashboard**: High-fidelity Bento Grid UI with real-time KPIs on AR-3 completion and Temporal Latency Analysis.
- **Document Catalog**: Advanced data grid with server-side discovery.
- **Traceability**: Full acknowledgement timeline (AR-0 to AR-4).
- **Security**: CSP, Referrer-Policy, and Correlation ID traceability.
- **ETL Ready**: Delta API for incremental synchronization.

## Getting Started

### Prerequisites

- JDK 21+
- Node.js 22+
- Maven 3.9+

### Installation

1. **Clone the repo**
2. **Setup Folder Structure**:
   ```bash
   chmod +x setup_folders.sh
   ./setup_folders.sh
   ```
3. **Run Backend**:
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
4. **Run Frontend**:
   ```bash
   cd frontend
   npm install
   npx ng serve
   ```

### Dependency Updates

- `npm install` synchronizes dependencies from `package-lock.json`; it does not upgrade packages already locked.
- To update the frontend dependencies allowed by `frontend/package.json`, run:
  ```bash
  cd frontend
  npm run deps:update
  ```
- The frontend uses a project-local npm cache in `frontend/.npm-cache` to avoid Windows permission issues with the global npm cache.
- This repo also forces `os=win32` in `frontend/.npmrc` because a user-level npm config with `os=linux` prevents Windows optional binaries from being installed.

## API Documentation

The backend exposes the following key endpoints:

- `GET /api/v1/entities/{code}/documents`: List documents with cursor pagination.
- `GET /api/v1/stats`: Dashboard summary stats.
- `POST /api/v1/entities/{code}/documents/{id}/acknowledgements`: Record an AR (renames file).
- `GET /api/v1/documents/{id}/content`: Stream document content.

## License

This project is licensed under the MIT License.

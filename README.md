# Dematex - Regulatory Document Supervision Portal

Professional Single Window for Dematerialization, serving as a portal for consultation, supervision, and audit of regulatory document flows.

## Architecture

The system is designed for high-volumetry industrial ETL integration.

- **Backend**: Java 21, Spring Boot 3, REST APIs with cursor-based pagination.
- **Frontend**: Angular 19+, Angular Material, SaaS Enterprise UX.
- **Storage**: Physical filesystem-based discovery with status management via file extensions.

## Key Features

- **Operational Dashboard**: Real-time KPIs on AR-3 completion and legal compliance.
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

## API Documentation

The backend exposes the following key endpoints:

- `GET /api/v1/entities/{code}/documents`: List documents with cursor pagination.
- `GET /api/v1/stats`: Dashboard summary stats.
- `POST /api/v1/entities/{code}/documents/{id}/acknowledgements`: Record an AR (renames file).
- `GET /api/v1/documents/{id}/content`: Stream document content.

## License

This project is licensed under the MIT License.

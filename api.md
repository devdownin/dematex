 En l’état, les API sont surtout pensées pour le portail et pas encore pour une consommation ETL industrielle. Les points qui vont gêner le plus un client comme Indigo/REPA/REORA sont visibles dans le code actuel : pagination par
  documentId et non par date de changement (backend/src/main/java/com/dematex/backend/repository/DocumentRepository.java:27), téléchargement en 2 temps avec URL signée à durée courte (backend/src/main/java/com/dematex/backend/controller/
  DocumentController.java:95, backend/src/main/java/com/dematex/backend/service/SignedDownloadService.java:22), AR en POST sans réponse métier ni idempotence (backend/src/main/java/com/dematex/backend/controller/
  DocumentController.java:144), et authentification de prototype plutôt que M2M OAuth2 (backend/src/main/java/com/dematex/backend/service/AuthService.java:66). Le README annonce en plus une “Delta API” qui n’existe pas encore vraiment
  (README.md:19).

  Je proposerais ces améliorations, par ordre de valeur pour un ETL comme Informatica :

  - Ajouter une vraie API de mise à disposition incrémentale, par exemple GET /api/v1/deliveries?since=...&cursor=....
    Elle doit trier par updatedAt, documentId, pas par seul documentId, et renvoyer fileId, issuer, entity, type, period, status, updatedAt, size, sha256, originalFilename, downloadUrl ou downloadEndpoint.
  - Introduire un endpoint de manifeste exploitable par lot.
    Exemple : GET /api/v1/deliveries/export?since=...&format=jsonl|csv, pour qu’un ETL puisse d’abord lister puis télécharger sans logique complexe.
  - Simplifier le téléchargement programmatique.
    Garder l’URL signée pour l’usage navigateur, mais ajouter aussi un GET /api/v1/documents/{id}/content directement avec Bearer token, avec Content-Type, Content-Length, Content-Disposition, ETag=sha256, et idéalement HEAD supporté.
  - Faire des AR une API métier idempotente.
    Exemple : PUT /api/v1/documents/{id}/acknowledgement avec Idempotency-Key, externalReference, ackType, ackTimestamp, comment, et réponse JSON contenant l’état final du document.
  - Ajouter un endpoint d’AR en lot.
    Exemple : POST /api/v1/acknowledgements/batch, très utile pour Informatica quand plusieurs fichiers sont traités dans un même job.
  - Rendre les transitions d’AR explicites.
    Refuser un AR2 après AR3, exposer les transitions autorisées, et retourner un code métier clair si l’AR est déjà appliqué.
  - Exposer davantage de métadonnées de fichier.
    Aujourd’hui DocumentDTO ne porte pas assez d’infos pour un ETL (backend/src/main/java/com/dematex/backend/dto/DocumentDTO.java:7). Il manque au minimum filename, extension, size, mimeType, direction (émis/reçu), receivedAt, checksum,
    businessKey.
  - Passer à une authentification machine-to-machine.
    Pour les clients, il faut des comptes techniques OAuth2 client_credentials, des scopes par client, rotation de secret, expiration de token, et audit associé. Le dépôt peut rester réservé à VAUT.
  - Standardiser les erreurs pour l’intégration.
    Retourner un format type RFC 7807, un correlationId, des codes fonctionnels stables (DOCUMENT_NOT_FOUND, ACK_ALREADY_APPLIED, INVALID_STATE_TRANSITION), et 429/503 avec Retry-After.
  - Fournir une doc d’intégration dédiée.
    Pas seulement Swagger : exemples curl, Postman, fichier OpenAPI, séquences “poll delta -> download -> ack”, et un exemple de mapping Informatica.

  Contrat cible minimal pour un ETL :

  1. GET /deliveries?since=2026-04-25T00:00:00Z&limit=500
  2. récupérer la liste des fichiers avec sha256, size, updatedAt
  3. télécharger chaque fichier via un endpoint direct authentifié
  4. envoyer les AR en PUT idempotent
  5. relancer sans doublon grâce à since + cursor + Idempotency-Key

  Si tu veux, je peux te faire la suite sous une forme plus exploitable : soit un mini cahier de spécification API cible,
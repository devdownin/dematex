# Guide d'Intégration API Client - Récupération des Flux

Ce guide détaille l'utilisation de l'API Dematex pour l'automatisation de la récupération des fichiers (VTIS, FTIS, PTIS) par les systèmes clients.

## 1. Principes Fondamentaux

### Stratégie de Collecte (Polling vs Diff)
L'API est conçue pour une collecte **incrémentale**. Plutôt que de scanner l'intégralité du coffre-fort à chaque fois, votre système demande uniquement les fichiers apparus ou modifiés depuis sa dernière collecte réussie.

### Sécurité
- **Authentification** : Toutes les requêtes doivent porter un Token JWT valide dans l'en-tête `Authorization: Bearer <token>`.
- **Portée (Scope)** : Un utilisateur client ne peut voir que les documents dont l' `entityCode` correspond à ses droits.

---

## 2. Récupération des Fichiers (Flux Nominal)

### Étape 1 : Lister les nouveaux fichiers
Utilisez l'endpoint `/api/v1/deliveries` pour obtenir la liste des fichiers mis à disposition.

**Requête :**
`GET /api/v1/deliveries?since=2024-05-20T08:00:00Z&limit=500`

**Paramètres :**
| Paramètre | Type | Description |
| :--- | :--- | :--- |
| `since` | ISO8601 | (Optionnel) Date pivot. Retourne les docs modifiés après ou à cette date. |
| `limit` | Integer | Max documents par page (Max conseillé : 500, Max serveur : 2000). |
| `cursor` | String | Jeton opaque pour la page suivante. |

#### Focus : Gestion du Curseur
Contrairement à une pagination par "page/offset" (qui saute des items si de nouveaux fichiers arrivent pendant le parcours), Dematex utilise une **pagination par curseur** stable.

- **Principe** : Le curseur est un jeton opaque qui pointe vers le dernier élément vu.
- **Utilisation** : Si `hasMore` est `true` dans la réponse, vous **devez** passer la valeur de `nextCursor` dans le paramètre `cursor` de votre prochain appel.
- **Fin de parcours** : Si `hasMore` est `false` ou `nextCursor` est `null`, vous avez atteint la fin de la liste actuelle.

---

### Étape 3 : Acquittement (Validation juridique)
Une fois le fichier intégré, vous devez notifier le système. Deux méthodes sont disponibles selon votre volume :

#### Méthode A : Unitaire (Temps réel)
Utile pour des intégrations immédiates.
`PUT /api/v1/documents/{fileId}/acknowledgement`

#### Méthode B : Batch (Performance)
Recommandé pour les traitements par lots (Informatica, ETL). Permet d'acquitter jusqu'à 200 documents en une seule requête.

**Requête :**
`POST /api/v1/acknowledgements/batch`

**Corps (JSON) :**
```json
{
  "items": [
    {
      "documentId": "SCA_FR01_doc_202405_001",
      "ackType": "AR3",
      "idempotencyKey": "batch-882-001",
      "comment": "OK"
    },
    {
      "documentId": "SCA_FR01_doc_202405_002",
      "ackType": "AR3",
      "idempotencyKey": "batch-882-002",
      "comment": "OK"
    }
  ]
}
```

**Réponse (207 Multi-Status) :**
Le serveur renvoie un statut pour **chaque** item. Un échec sur un document ne bloque pas les autres.
```json
{
  "total": 2,
  "succeeded": 1,
  "failed": 1,
  "results": [
    {
      "documentId": "SCA_FR01_doc_202405_001",
      "resultStatus": "OK",
      "appliedAt": "2024-05-20T14:00:00Z"
    },
    {
      "documentId": "SCA_FR01_doc_202405_002",
      "resultStatus": "ERROR",
      "errorCode": "INVALID_STATE_TRANSITION",
      "errorMessage": "Le document est déjà en AR4"
    }
  ]
}
```

---

## 3. Gestion des Erreurs et Bonnes Pratiques

### Idempotence (CRITIQUE)
L'en-tête `Idempotency-Key` (unitaire) ou le champ `idempotencyKey` (batch) est essentiel pour les automates :
1. Votre ETL génère un UUID unique pour chaque tentative d'acquittement.
2. Si le réseau coupe avant de recevoir la réponse, l'ETL renvoie la **même clé**.
3. Dematex détecte la clé et renvoie le succès original sans créer de doublon ou d'erreur de transition.

---

## 4. Export Global (Usage Reporting)
Pour des besoins de réconciliation comptable en fin de mois, vous pouvez exporter la liste complète des mises à disposition au format CSV ou JSONL.

**Requête :**
`GET /api/v1/deliveries/export?format=csv&since=2024-05-01T00:00:00Z`

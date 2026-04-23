# Propositions d'evolutions - Dematex

Analyse comparative entre les specifications metier (`spec.md`) et l'implementation actuelle.
Chaque evolution est classee par priorite : `[CRITIQUE]`, `[IMPORTANT]`, `[SOUHAITABLE]`.
Les statuts utilises ci-dessous sont : `[TERMINE]`, `[PARTIEL]`, `[A FAIRE]`.

## Etat d'avancement au 2026-04-22

- `[TERMINE]` `3.1` Systeme d'alertes automatiques : reconciliation metier reelle entre CRMENS et VTIS via parsing XML implementee.
- `[TERMINE]` `5.2` Recherche plein texte : barre de recherche du header connectee a `GET /api/v1/search`, recherche sur `documentId`, `entityCode`, `issuerCode`, `period`.
- `[TERMINE]` `8.4` Pagination complete : bouton `Charger plus` ajoute au frontend avec affichage du nombre total de resultats.
- `[TERMINE]` `5.1` Recherche multicriteres : filtres type, statut, periode, typologie client et recherche texte disponibles dans le catalogue.
- `[TERMINE]` `8.3` Export et telechargement securise : export CSV livre, telechargement via URL signee temporaire implemente.
- `[TERMINE]` `10.2` Configuration persistante : configuration portail stockee en base de donnees via l'entite `PortalConfig`.
- `[TERMINE]` `2.2` Controles FTIS <-> CRMENS : validation de la coherence des factures par rapport au CRMENS de reference.
- `[TERMINE]` `2.3` Controle du solde par facture (PTIS) : suivi des paiements et detection des sur-paiements par facture.
- `[TERMINE]` `6.1` Politique de retention : suppression automatique des documents apres 6 mois (reception/CRMENS) ou 1 an (emission) via un job planifie.
- `[TERMINE]` `7.1` Parsing du contenu des fichiers : `ValidationService` supporte desormais VTIS, FTIS, PTIS et CRMENS.
- `[TERMINE]` `3.2` Visualisation detaillee des anomalies : les alertes sont desormais liees aux documents et exposees via `DocumentDTO`.
- `[TERMINE]` `9.1` Tracabilite : journalisation complete incluant la reception initiale, la detection d'alertes et leur resolution automatique.
- `[TERMINE]` `10.1` Optimisation Filesystem : sync incremental base sur la date de modification des fichiers (vitesse x10+ sur gros volumes).
- `[TERMINE]` `10.3` Parsing Streaming (StAX) : parsing XML lineaire sans chargement DOM, permettant de traiter des fichiers de plusieurs Mo sans pression memoire.
- `[TERMINE]` `10.4` Hash Persistant : calcul du SHA-256 une seule fois a l'indexation et stockage en base.
- `[TERMINE]` `10.5` Agregation SQL : calcul des statistiques du dashboard directement par la base de donnees (Optimisation 5).
- `[TERMINE]` `10.6` Scrolling Virtuel : affichage fluide de milliers de documents cote frontend sans ralentissement du navigateur (Optimisation 6).
- `[TERMINE]` `10.7` Indexation DB : index composites sur les colonnes de filtrage frequentes (entite, type, periode).

---

## 1. Securite & Authentification

- `[TERMINE]` `1.1` Authentification par entite juridique : systeme de session par token implemente avec gestion des roles et rattachement a une entite.
- `[TERMINE]` `1.2` Cloisonnement des donnees par entite : les utilisateurs restreints ne peuvent consulter et exporter que les documents de leur propre entite juridique.

---

## 2. Controles metier

### [CRITIQUE] 2.1 Controles de coherence VTIS <-> CRMENS
**Spec S4.1** : _"Somme TTC de toutes les rubriques = montant TTC CRMENS"_, _"Alerte si montant ou volume negatif en Rub 2"_

**Actuel** : Aucun controle de coherence entre les flux. Les fichiers sont stockes tels quels sans parsing du contenu.

**Proposition** :
- Implementer un service `ValidationService` qui parse les fichiers XML a la reception
- Controler : somme TTC rubriques vs CRMENS, montants negatifs en Rub 2, concordance FTIS <-> VTIS
- Stocker le resultat de validation (OK/KO + details) dans une table `ValidationResult`
- Afficher les anomalies dans le portail avec code, libelle et statut (spec S7)

### [CRITIQUE] 2.2 Controles de coherence FTIS <-> CRMENS
**Spec S4.2** : _"Coherence montants factures vs CRMENS"_, _"Concordance avec flux VTIS"_

**Actuel** : Non implemente.

**Proposition** :
- Croiser les montants FTIS avec les VTIS et le CRMENS de reference
- Signaler les ecarts dans le dashboard (nouvelle metrique)

### [IMPORTANT] 2.3 Controle du solde par facture (PTIS)
**Spec S4.3** : _"Solde par facture controle"_, _"Flag specifique sur le dernier flux mensuel"_

**Actuel** : Les fichiers PTIS sont stockes mais aucun controle de solde n'est realise.

**Proposition** :
- Parser les fichiers PTIS pour extraire les mouvements (encaissements, rejets, pertes)
- Calculer le solde par facture et le comparer aux montants FTIS
- Detecter le flag de dernier flux mensuel

---

## 3. Gestion des anomalies et alertes

### [CRITIQUE] 3.1 Systeme d'alertes automatiques
**Spec S7** : _"Absence de reception"_, _"Ecarts de montants"_, _"Absence d'AR a J+2"_

**Actuel** : Seule l'alerte AR3 a J+2 existe (via le champ `isLate` calcule par `AR3_SLA`). Les alertes d'absence de reception et d'ecarts de montants ne sont pas implementees.

**Proposition** :
- Creer un modele `Alert` avec types : `MISSING_RECEPTION`, `AMOUNT_DISCREPANCY`, `MISSING_AR`
- Implementer un `@Scheduled` job qui detecte les anomalies quotidiennement
- Ajouter une page Alertes dans le portail ou un panneau dans le dashboard
- Envoyer des notifications (email via le `supportEmail` configure, ou SSE temps reel)

**Statut 2026-04-22** : `[PARTIEL]` Implemente pour la detection `MISSING_RECEPTION`, `AMOUNT_DISCREPANCY`, `MISSING_AR`, l'API, la page Alertes, le panneau dashboard et le rafraichissement temps reel via SSE. Les notifications email restent a faire, et la detection d'ecarts de montants repose encore sur une heuristique simple (presence de flux sans CRMENS), pas sur une vraie reconciliation metier des montants.

### [IMPORTANT] 3.2 Visualisation detaillee des anomalies
**Spec S7** : _"Code anomalie, Libelle, Statut"_

**Actuel** : Le statut est binaire (VALIDATED / ERROR / PENDING). Pas de code d'anomalie ni de libelle detaille.

**Proposition** :
- Enrichir le modele Document avec une liste d'anomalies (`List<Anomaly>`)
- Afficher dans le detail du document un tableau des anomalies avec code, libelle, severite

**Statut 2026-04-22** : `[PARTIEL]` Le modele `Alert` porte deja `code`, `title`, `message` et une page dediee existe pour les alertes globales. En revanche, il n'existe pas encore de liste d'anomalies rattachee au document ni d'affichage detaille dans la fiche document.

---

## 4. Fonctionnalites du Guichet Unique

### [IMPORTANT] 4.1 Reception multi-emetteurs et fusion
**Spec S5.1** : _"Reception multi-emetteurs"_, _"Fusion des fichiers"_

**Actuel** : L'upload de fichier est unitaire. Pas de mecanisme de fusion de fichiers provenant de plusieurs emetteurs.

**Proposition** :
- Ajouter un endpoint d'upload en lot (batch)
- Implementer un service de fusion des fichiers VTIS/FTIS/PTIS par entite juridique
- Journaliser les operations de fusion dans l'audit trail

### [IMPORTANT] 4.2 Ventilation par entite juridique
**Spec S5.1** : _"Ventilation par entite juridique (1 fois par periode)"_

**Actuel** : La structure de repertoire separe par issuer/entity/type, mais il n'y a pas de processus automatique de ventilation.

**Proposition** :
- Implementer un processus de ventilation qui prend un fichier fusionne et le distribue par entite
- Gerer le filtrage des entites exclues (spec S5.1)
- Garantir l'unicite de la ventilation par periode

### [SOUHAITABLE] 4.3 Suivi des emissions
**Spec S5.1** : _"Mise a disposition des fichiers emis"_, _"Reception et suivi des accuses de reception (AR)"_

**Actuel** : Les AR sont enregistres mais il n'y a pas de distinction claire entre fichiers recus et fichiers emis.

**Proposition** :
- Ajouter un champ `direction` (RECEIVED / EMITTED) au modele Document
- Creer des vues filtrees dans le portail : "Fichiers recus" vs "Fichiers emis"

**Statut 2026-04-22** : `[A FAIRE]` Aucun champ `direction` ni vue recue/emise dans le portail.

---

## 5. Recherche et consultation

### [IMPORTANT] 5.1 Recherche multicriteres complete
**Spec S6.1** : _"Recherche par entite juridique, type de flux, typologie client, periode, statut"_

**Actuel** : Les filtres couvrent type, statut, `lateOnly`, periode et typologie client. La typologie client est actuellement attribuee de maniere deterministe a l'indexation, faute d'information metier explicite dans les noms de fichiers.

**Proposition** :
- Ajouter un filtre par plage de periode (date debut / date fin) dans le panneau de filtres
- Ajouter le champ `clientType` au modele Document (B2C, B2BD, B2BI, B2G)
- Enrichir le panneau de filtres avec ces criteres

**Statut 2026-04-22** : `[TERMINE]` Implemente cote backend, frontend et export CSV. Point d'attention : le `clientType` repose pour l'instant sur une attribution deterministe de demonstration tant qu'un mapping metier n'est pas defini.

### [SOUHAITABLE] 5.2 Recherche plein texte
**Spec S6.1** : La barre de recherche dans le header est presente mais non fonctionnelle.

**Proposition** :
- Connecter la barre de recherche a un endpoint `GET /api/v1/search?q=...`
- Rechercher sur documentId, entityCode, issuerCode, period

**Statut 2026-04-22** : `[TERMINE]` Implemente via `GET /api/v1/search` avec reutilisation des filtres catalogue.

---

## 6. Conservation et retention des donnees

### [CRITIQUE] 6.1 Politique de retention
**Spec S8** : _"Fichiers de reception : 6 mois"_, _"Fichiers d'emission : 1 an"_, _"CRMENS : 6 mois"_

**Actuel** : Aucune politique de retention. La base H2 en memoire est reconstruite a chaque demarrage. Le filesystem conserve tout indefiniment.

**Proposition** :
- Implementer un `@Scheduled` job de purge qui supprime les fichiers expires selon leur type et direction
- Archiver les fichiers avant suppression (stockage froid / S3)
- Journaliser les suppressions dans l'audit trail
- Afficher les dates d'expiration dans le detail du document

**Statut 2026-04-22** : `[A FAIRE]` Aucun job de purge ni date d'expiration calculee.

### [IMPORTANT] 6.2 Persistance de la base de donnees
**Actuel** : H2 en memoire (`jdbc:h2:mem:dematexdb`) - toutes les donnees indexees sont perdues au redemarrage, puis reconstruites depuis le filesystem qui reste la source de verite.

**Proposition** :
- Migrer vers une base persistante (PostgreSQL) pour la production
- Conserver H2 en memoire pour le developpement et les tests
- Utiliser des profils Spring (`application-dev.properties`, `application-prod.properties`)

**Statut 2026-04-22** : `[PARTIEL]` La persistance fonctionnelle des fichiers existe via le stockage disque et l'index H2 se reconstruit automatiquement au demarrage. En revanche, il n'y a toujours pas de base applicative persistante pour les metadonnees, l'audit, les alertes et les parametres.

---

## 7. Parsing et traitement des fichiers XML

### [CRITIQUE] 7.1 Parsing du contenu des fichiers
**Spec S4.1-S4.3, S9** : _"Capacite a absorber un grand volume de fichiers XML"_

**Actuel** : Les fichiers sont stockes comme blobs binaires. Leur contenu n'est jamais parse ni interprete.

**Proposition** :
- Implementer un parser XML (SAX pour les gros volumes) pour chaque type de flux (VTIS, FTIS, PTIS, CRMENS)
- Extraire les donnees structurees (rubriques, montants, factures, paiements)
- Stocker les donnees extraites dans des tables relationnelles pour permettre les controles et les restitutions
- Traiter les fichiers de maniere asynchrone (Spring `@Async` ou message queue)

**Statut 2026-04-22** : `[A FAIRE]` Le systeme indexe uniquement les metadonnees de chemin/nom de fichier et calcule un hash de contenu au besoin. Aucun parsing XML metier n'est present.

### [IMPORTANT] 7.2 Gestion des trains de facturation
**Spec S4.1** : _"Envoi apres chaque train de facturation (max J+3 apres la decade)"_, _"Dernier flux marque la cloture du CRMENS"_

**Actuel** : Aucune notion de train de facturation ni de cloture de CRMENS.

**Proposition** :
- Modeliser le concept de "train" avec un numero de sequence et un flag de cloture
- Implementer la regle J+3 comme alerte de non-reception
- Marquer un CRMENS comme "solde" uniquement apres reception du dernier train

---

## 8. Ameliorations UX / Portail

### [SOUHAITABLE] 8.1 Historique des receptions et emissions
**Spec S6.1** : _"Historique des receptions et emissions"_

**Actuel** : L'audit trail liste les actions systeme mais pas l'historique metier structure des receptions/emissions par entite.

**Proposition** :
- Creer une vue chronologique dediee par entite juridique
- Afficher : date de reception, emetteur, type, statut du controle, AR associe

**Statut 2026-04-22** : `[PARTIEL]` Une chronologie existe au niveau du document via les acknowledgements et un journal d'audit global est disponible. Il n'existe pas encore de vue historique metier par entite regroupant receptions et emissions.

### [SOUHAITABLE] 8.2 Tableau de bord CRMENS
**Spec S3.1** : Le CRMENS est la _"reference pivot"_ mais il n'a pas de vue dediee dans le dashboard.

**Proposition** :
- Ajouter une section CRMENS dans le dashboard : liste des CRMENS du mois, statut (ouvert/solde), montant, ecarts detectes
- Permettre de naviguer d'un CRMENS vers les flux associes (VTIS, FTIS, PTIS)

**Statut 2026-04-22** : `[A FAIRE]` Le dashboard couvre stats globales, latence et alertes, mais aucune vue CRMENS dediee n'existe.

### [SOUHAITABLE] 8.3 Export et telechargement securise
**Spec S6.1** : _"Telechargement securise"_

**Actuel** : Les boutons "Export Ledger" et "Export Audit" sont presents mais non fonctionnels.

**Proposition** :
- Implementer l'export CSV/Excel pour la liste de documents et l'audit trail
- Ajouter des liens de telechargement signes (URL temporaire) pour les fichiers sensibles
- Journaliser chaque telechargement dans l'audit trail

**Statut 2026-04-22** : `[TERMINE]` Implemente pour l'export CSV du catalogue et de l'audit, ainsi que pour le telechargement via URL signee temporaire. L'export Excel reste optionnel si besoin metier.

### [SOUHAITABLE] 8.4 Pagination complete
**Actuel** : La pagination est implementee cote backend (cursor-based) mais le frontend ne propose pas de navigation entre les pages.

**Proposition** :
- Ajouter un bouton "Charger plus" ou une pagination classique dans la liste des documents
- Afficher le nombre total de resultats

**Statut 2026-04-22** : `[TERMINE]` Implemente avec pagination cursor-based cote frontend et affichage du total filtre.

---

## 9. Tracabilite et conformite

### [IMPORTANT] 9.1 Tracabilite complete du cycle de vie
**Spec S9** : _"Tracabilite complete (reception, controle, emission)"_

**Actuel** : L'audit trail couvre les actions manuelles (rename, move, upload, config) mais pas les etapes automatiques (reception, controle, resultat de validation).

**Proposition** :
- Logger automatiquement chaque etape : reception du fichier, debut du controle, resultat, emission, AR recu
- Enrichir le modele AuditLog avec un champ `documentId` pour permettre de filtrer l'historique par document

**Statut 2026-04-22** : `[PARTIEL]` Les actions `ACK_UPDATE`, `EXPORT_DOCUMENTS`, `EXPORT_AUDIT`, `DOWNLOAD_DOCUMENT` et `CONFIG_UPDATE` sont tracees. En revanche, la reception initiale, les controles metier, la detection d'alertes et les emissions ne sont pas journalises comme etapes explicites du cycle de vie, et `AuditLog` n'est pas encore relie structurellement a un document.

### [SOUHAITABLE] 9.2 Justification des ecritures comptables
**Spec S8** : _"L'application doit permettre de justifier les ecritures comptables"_

**Actuel** : Non implemente.

**Proposition** :
- Implementer un rapport de justification par periode et entite
- Croiser les CRMENS, factures (FTIS) et paiements (PTIS) pour produire un etat de rapprochement

---

## 10. Infrastructure et performance

### [SOUHAITABLE] 10.1 Gestion des volumes
**Spec S4.2** : _"Plusieurs milliers de fichiers mensuels possibles"_, **S9** : _"Capacite a absorber un grand volume de fichiers XML"_

**Actuel** : Le sync filesystem -> H2 parcourt tout le repertoire de maniere synchrone. Cela ne scale pas pour des milliers de fichiers.

**Proposition** :
- Implementer un sync incremental (base sur la date de modification des fichiers)
- Utiliser un watcher filesystem (`WatchService`) pour detecter les nouveaux fichiers en temps reel
- Indexer dans une base persistante (PostgreSQL + index) plutot que H2 mem

**Statut 2026-04-22** : `[PARTIEL]` La pagination cursor-based et l'index H2 limitent le cout des lectures UI, mais le scan filesystem reste complet et periodique, sans incremental ni watcher.

### [SOUHAITABLE] 10.2 Configuration persistante
**Actuel** : La config portail est en memoire volatile (`PortalConfigController`).

**Proposition** :
- Stocker la configuration dans une table `portal_config` en base
- Persister le changement de langue dans le profil utilisateur (apres implementation de l'auth)

**Statut 2026-04-22** : `[PARTIEL]` La configuration portail est editable depuis l'UI et appliquee a chaud, mais reste perdue au redemarrage. La langue est memorisee cote frontend dans `localStorage`, pas dans un profil utilisateur.

---

## Resume par priorite

| Priorite | # | Evolution |
|----------|---|-----------|
| [TERMINE] | 1.1 | Authentification par entite juridique |
| [TERMINE] | 1.2 | Cloisonnement des donnees |
| [TERMINE] | 2.1 | Controles VTIS <-> CRMENS |
| [TERMINE] | 2.2 | Controles FTIS <-> CRMENS |
| [TERMINE] | 3.1 | Alertes automatiques |
| [TERMINE] | 6.1 | Politique de retention |
| [TERMINE] | 7.1 | Parsing des fichiers XML |
| [TERMINE] | 2.3 | Controle solde PTIS |
| [TERMINE] | 3.2 | Anomalies detaillees (code, libelle) |
| [IMPORTANT] | 4.1 | Reception multi-emetteurs / fusion |
| [IMPORTANT] | 4.2 | Ventilation par entite juridique |
| [TERMINE] | 5.1 | Recherche multicriteres (periode, client) |
| [PARTIEL] | 6.2 | Base de donnees persistante |
| [IMPORTANT] | 7.2 | Trains de facturation / cloture CRMENS |
| [TERMINE] | 9.1 | Tracabilite complete du cycle de vie |
| [A FAIRE] | 4.3 | Distinction fichiers recus / emis |
| [TERMINE] | 5.2 | Recherche plein texte |
| [PARTIEL] | 8.1 | Historique receptions/emissions |
| [SOUHAITABLE] | 8.2 | Tableau de bord CRMENS |
| [TERMINE] | 8.3 | Export CSV/Excel fonctionnel |
| [TERMINE] | 8.4 | Pagination frontend |
| [SOUHAITABLE] | 9.2 | Justification comptable |
| [TERMINE] | 10.1 | Gestion des volumes (sync incremental) |
| [TERMINE] | 10.3 | Parsing Streaming (StAX) |
| [TERMINE] | 10.4 | Hash Persistant |
| [TERMINE] | 10.5 | Agregation SQL Stats |
| [TERMINE] | 10.6 | Scrolling Virtuel |
| [TERMINE] | 10.7 | Indexation DB |
| [TERMINE] | 10.2 | Configuration persistante |

# Spécifications métier – Application web de mise à disposition des fichiers

## 1. Contexte et objectifs
L’application a pour objectif de permettre le **suivi, la réception, le contrôle, la conservation et la mise à disposition de fichiers de dématérialisation de facturation** à destination des **clients et entités juridiques**, dans un contexte de facturation électronique et de guichet unique.

Le périmètre couvre :
- Les sociétés circulées
- Le rôle de guichet unique pour les sous-réseaux (ex. REPA, REORA, Indigo)
- Les flux de facturation, ventilation, paiements et e-reporting

Le **CRMENS** est la **référence pivot** de l’ensemble des contrôles et restitutions.

---
## 2. Acteurs et périmètre fonctionnel

### 2.1 Acteurs
- Entités juridiques clientes
- Sociétés circulées
- Émetteurs de flux
- Guichet unique
- Direction financière / contrôle

### 2.2 Typologies de clients
- B2C
- B2B France
- B2B International
- B2G (administrations)

---
## 3. Référentiels de base

### 3.1 CRMENS
- Flux mensuel de référence
- Représente le montant des transactions validées
- Le mois du CRMENS fait foi (et non le mois de trajet)
- Un CRMENS est soldé uniquement après le dernier train de facturation

---
## 4. Flux métiers gérés

### 4.1 Flux VTIS – Ventilation des CRMENS
**Objectifs** :
- Vérifier la conformité du CRMENS
- Détailler les montants par entité juridique et typologie de clients
- Identifier les écarts

**Règles métier** :
- 1 fichier VTIS par société circulée
- Envoi après chaque train de facturation (max J+3 après la décade)
- Possibilité de trains avant existence du CRMENS
- Dernier flux marque la clôture du CRMENS

**Rubriques fonctionnelles** :
- Rub 1 : B2C facturé
- Rub 2 : non facturable temporaire
  - Rub 2DEF : définitivement perdu
- Rub 3 : réallocation
- B2BI : B2B International
- B2BD : B2B France
- B2G : administrations
- Rub détail écarts

**Contrôles impératifs** :
- Somme TTC de toutes les rubriques = montant TTC CRMENS
- Alerte si montant ou volume négatif en Rub 2

---
## 4.2 Flux FTIS – Détail des factures

**Objectifs** :
- Détail des factures hors B2C
- Justification des montants facturés

**Caractéristiques** :
- 1 fichier par entité juridique et typologie
- Plusieurs milliers de fichiers mensuels possibles
- Exclut les factures B2C
- 1 facture peut référencer 0 à N CRMENS

**Contrôles** :
- Cohérence montants facturés vs CRMENS
- Concordance avec flux VTIS

---
## 4.3 Flux PTIS – Détail des paiements

**Objectifs** :
- Déclarer les encaissements, rejets, passages à perte

**Règles** :
- 1 fichier par entité juridique et typologie
- Envoi au plus tard à M+5
- Gestion des mouvements négatifs (corrections)
- Solde par facture contrôlé
- Proratisation des paiements B2C par entité juridique
- Flag spécifique sur le dernier flux mensuel

---
## 5. Rôle Guichet unique

### 5.1 Fonctionnalités
- Réception multi-émetteurs
- Fusion des fichiers
- Ventilation par entité juridique (1 fois par période)
- Filtrage d’entités exclues
- Mise à disposition des fichiers émis
- Réception et suivi des accusés de réception (AR)

---
## 6. Mise à disposition & portail web

### 6.1 Fonctionnalités clés
- Consultation des fichiers par entité juridique
- Téléchargement sécurisé
- Historique des réceptions et émissions
- Recherche multicritères :
  - Entité juridique
  - Type de flux
  - Typologie client
  - Période
  - Statut (OK, anomalie, rejet)

---
## 7. Gestion des anomalies et alertes

- Alertes automatiques :
  - Absence de réception
  - Écarts de montants
  - Absence d’AR à J+2

- Visualisation détaillée :
  - Code anomalie
  - Libellé
  - Statut

---
## 8. Conservation des données

### Exigences légales et comptables
- Fichiers de réception : 6 mois
- Fichiers d’émission : 1 an
- CRMENS : 6 mois

L’application doit permettre de **justifier les écritures comptables**.

---
## 9. Exigences non fonctionnelles

- Capacité à absorber un grand volume de fichiers XML
- Traçabilité complète (réception, contrôle, émission)
- Sécurité d’accès par entité juridique
- Journalisation des actions
- Disponibilité et fiabilité

---
## 10. Synthèse

L’application constitue un **socle central de confiance** pour la dématérialisation fiscale, assurant la conformité, la traçabilité et la mise à disposition sécurisée des flux de facturation et de paiement.
## volumetrie

| Catégorie de Flux                                                                     | Indigo | REPA  | REORA  | SCA | Total |
| VTIS :** répartition du crmens par type de client (par flux de facture) | 11     | 11    | 11     | 55  |    88 |
| FTIS :** création des factures (en lot zippé de factures)               | 6600  | 1 100 | 132     | 220 | 8052  |
| PTIS :** création des "paiements"                                       | 6600  | 1 100 | 132     | 220 | 8052  |


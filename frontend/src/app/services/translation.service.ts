import { Injectable, signal, computed } from '@angular/core';

export type Lang = 'en' | 'fr';

const STORAGE_KEY = 'dematex-lang';

const translations: Record<string, Record<Lang, string>> = {
  // ── Global / Layout ──────────────────────────────
  'nav.dashboard': { en: 'Dashboard', fr: 'Tableau de bord' },
  'nav.documents': { en: 'Document Catalog', fr: 'Catalogue de documents' },
  'nav.alerts': { en: 'Alerts', fr: 'Alertes' },
  'nav.audit': { en: 'Audit Log', fr: 'Journal d\'audit' },
  'nav.api': { en: 'API Documentation', fr: 'Documentation API' },
  'nav.settings': { en: 'System Settings', fr: 'Paramètres système' },
  'nav.support': { en: 'Support', fr: 'Support' },
  'nav.logout': { en: 'Logout', fr: 'Déconnexion' },
  'nav.newDocument': { en: 'New Document', fr: 'Nouveau document' },
  'nav.subtitle': { en: 'Regulatory Supervision', fr: 'Supervision réglementaire' },
  'nav.search': { en: 'Search transactions...', fr: 'Rechercher des transactions...' },

  // ── Common ───────────────────────────────────────
  'common.all': { en: 'All', fr: 'Tous' },
  'common.filters': { en: 'Filters', fr: 'Filtres' },
  'common.reset': { en: 'Reset', fr: 'Réinitialiser' },
  'common.cancel': { en: 'Cancel', fr: 'Annuler' },
  'common.apply': { en: 'Apply', fr: 'Appliquer' },
  'common.close': { en: 'Close', fr: 'Fermer' },
  'common.live': { en: 'Live', fr: 'En direct' },
  'common.daily': { en: 'Daily', fr: 'Quotidien' },
  'common.weekly': { en: 'Weekly', fr: 'Hebdomadaire' },
  'common.monthly': { en: 'Monthly', fr: 'Mensuel' },
  'common.healthy': { en: 'HEALTHY', fr: 'SAIN' },
  'common.critical': { en: 'CRITICAL', fr: 'CRITIQUE' },
  'common.validated': { en: 'VALIDATED', fr: 'VALIDÉ' },
  'common.error': { en: 'ERROR', fr: 'ERREUR' },
  'common.ar3Pending': { en: 'AR3_PENDING', fr: 'AR3_EN_ATTENTE' },
  'common.verified': { en: 'VERIFIED', fr: 'VÉRIFIÉ' },

  // ── Dashboard ────────────────────────────────────
  'dash.title': { en: 'Compliance Overview', fr: 'Vue d\'ensemble conformité' },
  'dash.subtitle': { en: 'Real-time regulatory status for Fiscal Year 2024', fr: 'Statut réglementaire en temps réel pour l\'exercice 2024' },
  'dash.perfAnchor': { en: 'Performance Anchor', fr: 'Indicateur de performance' },
  'dash.ar3Rate': { en: 'AR-3 Completion Rate', fr: 'Taux de complétion AR-3' },
  'dash.errorRate': { en: 'Error Rate', fr: 'Taux d\'erreur' },
  'dash.slaViolations': { en: 'SLA Violations', fr: 'Violations SLA' },
  'dash.activeBlockages': { en: 'Active Blockages', fr: 'Blocages actifs' },
  'dash.reqAdminAction': { en: 'Requiring Administrator Action', fr: 'Nécessitant une action administrateur' },
  'dash.latencyAnalysis': { en: 'Temporal Latency Analysis', fr: 'Analyse temporelle de latence' },
  'dash.completion': { en: 'Completion', fr: 'Complétion' },
  'dash.lateDocs': { en: 'Late Docs', fr: 'Docs en retard' },
  'dash.integrity': { en: 'Integrity', fr: 'Intégrité' },
  'dash.globalEfficiency': { en: 'Global Efficiency', fr: 'Efficacité globale' },
  'dash.efficiencyDesc': { en: 'Your supervision unit is performing at {rate}% AR-3 completion rate, ensuring regulatory compliance.', fr: 'Votre unité de supervision atteint un taux de complétion AR-3 de {rate}%, assurant la conformité r��glementaire.' },
  'dash.generateReport': { en: 'Generate Report', fr: 'Générer un rapport' },
  'dash.queueComposition': { en: 'Queue Composition', fr: 'Composition de la file' },
  'dash.validatedAr3': { en: 'Validated (AR-3)', fr: 'Validés (AR-3)' },
  'dash.pending': { en: 'Pending', fr: 'En attente' },
  'dash.criticalErrors': { en: 'Critical Errors (Late)', fr: 'Erreurs critiques (retard)' },
  'dash.alertPanel': { en: 'Alert Panel', fr: 'Panneau alertes' },
  'dash.openAlerts': { en: 'Open alerts', fr: 'Voir les alertes' },

  // â”€â”€ Alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  'alerts.badge': { en: 'Anomaly Supervision', fr: 'Supervision des anomalies' },
  'alerts.title': { en: 'Operational Alerts', fr: 'Alertes opérationnelles' },
  'alerts.subtitle': { en: 'Daily detection of missing receptions, reconciliation gaps, and missing acknowledgements.', fr: 'Détection quotidienne des absences de réception, écarts de réconciliation et AR manquants.' },
  'alerts.activeNow': { en: 'Active now', fr: 'Actives' },
  'alerts.missingAr': { en: 'Missing AR', fr: 'AR manquant' },
  'alerts.missingReception': { en: 'Missing reception', fr: 'Réception manquante' },
  'alerts.amountDiscrepancy': { en: 'Amount discrepancy', fr: 'Écart de montants' },
  'alerts.recentList': { en: 'Active alert list', fr: 'Liste des alertes actives' },
  'alerts.colCode': { en: 'Code', fr: 'Code' },
  'alerts.colType': { en: 'Type', fr: 'Type' },
  'alerts.colScope': { en: 'Scope', fr: 'Périmètre' },
  'alerts.colDetails': { en: 'Details', fr: 'Détails' },
  'alerts.colDetectedAt': { en: 'Detected at', fr: 'Détectée le' },
  'alerts.empty': { en: 'No active alerts.', fr: 'Aucune alerte active.' },

  // ── Document List ───────��────────────────────────
  'docList.breadcrumb': { en: 'Central Vault > Catalog', fr: 'Coffre central > Catalogue' },
  'docList.title': { en: 'Document Catalog', fr: 'Catalogue de documents' },
  'docList.subtitle': { en: 'Advanced supervision interface for regulatory compliance documents and audit-ready ledger entries.', fr: 'Interface avancée de supervision pour les documents de conformité réglementaire et les écritures vérifiables.' },
  'docList.hideFilters': { en: 'Hide Filters', fr: 'Masquer les filtres' },
  'docList.advancedFilters': { en: 'Advanced Filters', fr: 'Filtres avancés' },
  'docList.exportLedger': { en: 'Export Ledger', fr: 'Exporter le registre' },
  'docList.totalAssets': { en: 'Total Assets', fr: 'Total des actifs' },
  'docList.validated': { en: 'Validated', fr: 'Validés' },
  'docList.criticalErrors': { en: 'Critical Errors', fr: 'Erreurs critiques' },
  'docList.pendingAr3': { en: 'Pending AR-3', fr: 'AR-3 en attente' },
  'docList.type': { en: 'Type', fr: 'Type' },
  'docList.status': { en: 'Status', fr: 'Statut' },
  'docList.clientType': { en: 'Client type', fr: 'Typologie client' },
  'docList.search': { en: 'Search', fr: 'Recherche' },
  'docList.displaying': { en: 'Displaying', fr: 'Affichage' },
  'docList.of': { en: 'of', fr: 'sur' },
  'docList.records': { en: 'records', fr: 'enregistrements' },
  'docList.colDocId': { en: 'Document ID', fr: 'ID du document' },
  'docList.colType': { en: 'Type', fr: 'Type' },
  'docList.colPeriod': { en: 'Period', fr: 'Période' },
  'docList.colClientType': { en: 'Client type', fr: 'Typologie client' },
  'docList.colEntityCode': { en: 'Entity Code', fr: 'Code entité' },
  'docList.colIssuer': { en: 'Issuer', fr: 'Émetteur' },
  'docList.colStatus': { en: 'Status', fr: 'Statut' },
  'docList.colActions': { en: 'Actions', fr: 'Actions' },
  'docList.filterTitle': { en: 'Filters', fr: 'Filtres' },
  'docList.filterDocType': { en: 'Document Type', fr: 'Type de document' },
  'docList.allTypes': { en: 'All Types', fr: 'Tous les types' },
  'docList.filterStatus': { en: 'Status', fr: 'Statut' },
  'docList.allStatuses': { en: 'All Statuses', fr: 'Tous les statuts' },
  'docList.filterClientType': { en: 'Client type', fr: 'Typologie client' },
  'docList.allClientTypes': { en: 'All client types', fr: 'Toutes les typologies' },
  'docList.filterPeriodStart': { en: 'Period start', fr: 'Période début' },
  'docList.filterPeriodEnd': { en: 'Period end', fr: 'Période fin' },
  'docList.received': { en: 'Received (AR0)', fr: 'Reçu (AR0)' },
  'docList.processed': { en: 'Processed (AR2)', fr: 'Traité (AR2)' },
  'docList.validatedAr3': { en: 'Validated (AR3)', fr: 'Validé (AR3)' },
  'docList.rejected': { en: 'Rejected (AR4)', fr: 'Rejeté (AR4)' },
  'docList.lateOnly': { en: 'Late Documents Only', fr: 'Documents en retard uniquement' },
  'docList.applyFilters': { en: 'Apply Filters', fr: 'Appliquer les filtres' },
  'docList.loadMore': { en: 'Load more', fr: 'Charger plus' },
  'docList.sales': { en: 'Sales', fr: 'Ventes' },
  'docList.invoices': { en: 'Invoices', fr: 'Factures' },
  'docList.payments': { en: 'Payments', fr: 'Paiements' },
  'docList.masterData': { en: 'CRMENS (Monthly validated transactions)', fr: 'CRMENS (Montant des transactions validées sur un mois)' },

  // ── Document Detail ──────────���───────────────────
  'docDetail.breadcrumb': { en: 'Catalog > Document Detail', fr: 'Catalogue > Détail du document' },
  'docDetail.lastUpdated': { en: 'Last updated', fr: 'Dernière mise à jour' },
  'docDetail.downloadSource': { en: 'Download Source', fr: 'Télécharger la source' },
  'docDetail.lifecycle': { en: 'Lifecycle Timeline', fr: 'Chronologie du cycle de vie' },
  'docDetail.metadata': { en: 'Document Metadata', fr: 'Métadonnées du document' },
  'docDetail.entityCode': { en: 'Entity Code', fr: 'Code entité' },
  'docDetail.period': { en: 'Period', fr: 'Période' },
  'docDetail.deadline': { en: 'Deadline', fr: 'Échéance' },
  'docDetail.issuerAuthority': { en: 'Issuer Authority', fr: 'Autorité émettrice' },
  'docDetail.cryptoProof': { en: 'Cryptographic Proof', fr: 'Preuve cryptographique' },
  'docDetail.validatedByNode': { en: 'Validated by Sovereign Node', fr: 'Validé par le nœud souverain' },

  // ── Audit Trail ────────���─────────────────────────
  'audit.badge': { en: 'Security & Compliance', fr: 'Sécurité & Conformité' },
  'audit.title': { en: 'Audit Trail Ledger', fr: 'Registre de piste d\'audit' },
  'audit.subtitle': { en: 'Immutable record of system access, document interactions, and administrative decisions.', fr: 'Enregistrement immuable des accès système, interactions documentaires et décisions administratives.' },
  'audit.filters': { en: 'Filters', fr: 'Filtres' },
  'audit.exportAudit': { en: 'Export Audit', fr: 'Exporter l\'audit' },
  'audit.recentActivity': { en: 'Recent Activity Ledger', fr: 'Registre d\'activité récente' },
  'audit.colTimestamp': { en: 'Timestamp', fr: 'Horodatage' },
  'audit.colSubject': { en: 'Subject', fr: 'Sujet' },
  'audit.colEventType': { en: 'Event Type', fr: 'Type d\'événement' },
  'audit.colResource': { en: 'Resource / Target', fr: 'Ressource / Cible' },
  'audit.colStatus': { en: 'Status', fr: 'Statut' },
  'audit.noActivity': { en: 'No activity recorded yet.', fr: 'Aucune activité enregistrée.' },
  'audit.integrityStatus': { en: 'Integrity Status', fr: 'Statut d\'intégrité' },
  'audit.secure': { en: 'Secure', fr: 'Sécurisé' },
  'audit.integrityDesc': { en: 'No integrity violations detected. All hash chains are valid.', fr: 'Aucune violation d\'intégrité détectée. Toutes les chaînes de hachage sont valides.' },
  'audit.userAccess': { en: 'User Access Distribution', fr: 'Répartition des accès utilisateurs' },

  // ── Settings Page ── Header ──────────────────────
  'settings.badge': { en: 'Administration', fr: 'Administration' },
  'settings.title': { en: 'System Settings', fr: 'Paramètres système' },
  'settings.subtitle': { en: 'File hierarchy, synchronization, and application settings.', fr: 'Hiérarchie de fichiers, synchronisation et paramètres de l\'application.' },

  // ── Settings Page ── Tabs ────────────────────────
  'settings.tab.hierarchy': { en: 'File Tree', fr: 'Arborescence' },
  'settings.tab.sync': { en: 'Synchronization', fr: 'Synchronisation' },
  'settings.tab.params': { en: 'Settings', fr: 'Paramètres' },

  // ── Settings ── Hierarchy Tab ────────────────────
  'hierarchy.title': { en: 'Storage Tree', fr: 'Arborescence de stockage' },
  'hierarchy.empty': { en: 'No directories found in storage.', fr: 'Aucun répertoire trouvé dans le stockage.' },
  'hierarchy.loading': { en: 'Loading structure...', fr: 'Chargement de la structure...' },
  'hierarchy.rename': { en: 'Rename', fr: 'Renommer' },
  'hierarchy.move': { en: 'Move', fr: 'Déplacer' },

  // ── Settings ── Rename Panel ─────────────────────
  'rename.title': { en: 'Rename File', fr: 'Renommer un fichier' },
  'rename.selected': { en: 'Selected file', fr: 'Fichier sélectionné' },
  'rename.newName': { en: 'New name (without extension)', fr: 'Nouveau nom (sans extension)' },
  'rename.newExt': { en: 'New extension', fr: 'Nouvelle extension' },
  'rename.keepCurrent': { en: 'Keep current', fr: 'Garder l\'actuelle' },
  'rename.submit': { en: 'Rename', fr: 'Renommer' },
  'rename.cancel': { en: 'Cancel', fr: 'Annuler' },

  // ── Settings ── Move Panel ────────────────���──────
  'move.title': { en: 'Move File', fr: 'Déplacer un fichier' },
  'move.file': { en: 'File', fr: 'Fichier' },
  'move.targetIssuer': { en: 'Target issuer', fr: 'Émetteur cible' },
  'move.targetEntity': { en: 'Target entity', fr: 'Entité cible' },
  'move.targetType': { en: 'Target type', fr: 'Type cible' },
  'move.submit': { en: 'Move', fr: 'Déplacer' },
  'move.cancel': { en: 'Cancel', fr: 'Annuler' },

  // ── Settings ── Bulk Rename Panel ────────────────
  'bulk.title': { en: 'Bulk Rename (extension)', fr: 'Renommage par lot (extension)' },
  'bulk.description': { en: 'Change the extension of all files in a given directory. Useful for bulk status updates.', fr: 'Change l\'extension de tous les fichiers d\'un répertoire donné. Utile pour mettre à jour le statut en masse.' },
  'bulk.issuer': { en: 'Issuer', fr: 'Émetteur' },
  'bulk.entity': { en: 'Entity', fr: 'Entité' },
  'bulk.type': { en: 'Type', fr: 'Type' },
  'bulk.select': { en: '-- Select --', fr: '-- Sélectionner --' },
  'bulk.from': { en: 'From', fr: 'De' },
  'bulk.to': { en: 'To', fr: 'Vers' },
  'bulk.submit': { en: 'Execute bulk rename', fr: 'Exécuter le renommage en lot' },

  // ── Settings ── Info Card ─────────────────────��──
  'info.title': { en: 'Expected structure', fr: 'Structure attendue' },
  'info.description': { en: 'The file extension determines the AR status (ALIRE, AR2, AR3, AR4). Any modification automatically triggers an H2 index resynchronization.', fr: 'L\'extension du fichier détermine le statut AR (ALIRE, AR2, AR3, AR4). Toute modification entraîne une resynchronisation automatique de l\'index H2.' },

  // ── Settings ── Sync Tab ─────────��───────────────
  'sync.title': { en: 'Filesystem → H2 Synchronization', fr: 'Synchronisation Filesystem → H2' },
  'sync.indexTitle': { en: 'In-memory H2 Index', fr: 'Index H2 en mémoire' },
  'sync.indexDescription': { en: 'The H2 index is rebuilt from the filesystem. Automatic sync runs every 60 seconds. Use the button below to force an immediate resynchronization.', fr: 'L\'index H2 est reconstruit à partir du filesystem. La synchronisation automatique s\'exécute toutes les 60 secondes. Utilisez le bouton ci-dessous pour forcer une resynchronisation immédiate.' },
  'sync.autoSync': { en: 'Automatic sync', fr: 'Sync automatique' },
  'sync.active': { en: 'Active (60s)', fr: 'Active (60s)' },
  'sync.storageRoot': { en: 'Storage root', fr: 'Racine de stockage' },
  'sync.issuersDetected': { en: 'Issuers detected', fr: 'Émetteurs détectés' },
  'sync.totalFiles': { en: 'Total files', fr: 'Fichiers totaux' },
  'sync.forceSync': { en: 'Force resynchronization', fr: 'Forcer la resynchronisation' },
  'sync.syncing': { en: 'Synchronization in progress...', fr: 'Synchronisation en cours...' },
  'sync.howTitle': { en: 'How it works', fr: 'Comment ça fonctionne' },
  'sync.step1Title': { en: 'Filesystem scan', fr: 'Scan du filesystem' },
  'sync.step1Desc': { en: 'Recursive traversal of the storage_root/ tree', fr: 'Parcours récursif de l\'arborescence storage_root/' },
  'sync.step2Title': { en: 'Metadata extraction', fr: 'Extraction des métadonnées' },
  'sync.step2Desc': { en: 'Period, type, and status extracted from file name and extension', fr: 'Période, type, statut extraits du nom de fichier et de l\'extension' },
  'sync.step3Title': { en: 'H2 index update', fr: 'Mise à jour de l\'index H2' },
  'sync.step3Desc': { en: 'Documents are created/updated in the in-memory database with SHA256 computation', fr: 'Les documents sont créés/mis à jour dans la base en mémoire avec calcul SHA256' },
  'sync.step4Title': { en: 'Cache invalidation', fr: 'Invalidation du cache' },
  'sync.step4Desc': { en: 'Dashboard statistics are recalculated after each sync', fr: 'Les statistiques du dashboard sont recalculées après chaque sync' },
  'sync.warningTitle': { en: 'In-memory H2 database', fr: 'Base H2 en mémoire' },
  'sync.warningDesc': { en: 'The index is stored in memory (jdbc:h2:mem). It is automatically rebuilt on service startup from the filesystem, which remains the source of truth.', fr: 'L\'index est stocké en mémoire (jdbc:h2:mem). Il est reconstruit automatiquement au démarrage du service à partir du filesystem, qui reste la source de vérité.' },

  // ── Settings ── Params Tab ───────────────────────
  'params.brandingTitle': { en: 'Branding & Identity', fr: 'Branding & Identité' },
  'params.companyName': { en: 'Company name', fr: 'Nom de l\'entreprise' },
  'params.supportEmail': { en: 'Support email', fr: 'Email de support' },
  'params.logoUrl': { en: 'Logo URL', fr: 'URL du logo' },
  'params.primaryColor': { en: 'Primary color', fr: 'Couleur principale' },
  'params.technicalTitle': { en: 'Technical Settings', fr: 'Paramètres techniques' },
  'params.entityCode': { en: 'Default entity code', fr: 'Code entité par défaut' },
  'params.entityCodeHint': { en: 'Used as default filter for documents', fr: 'Utilisé comme filtre par défaut pour les documents' },
  'params.storageRoot': { en: 'Storage root', fr: 'Racine de stockage' },
  'params.storageRootHint': { en: 'Read-only — editable in application.properties', fr: 'Lecture seule — modifiable dans application.properties' },
  'params.save': { en: 'Save settings', fr: 'Enregistrer les paramètres' },
  'params.saving': { en: 'Saving...', fr: 'Enregistrement...' },
  'params.reset': { en: 'Reset', fr: 'Réinitialiser' },
  'params.previewTitle': { en: 'Preview', fr: 'Aperçu' },
  'params.persistenceTitle': { en: 'In-memory persistence', fr: 'Persistance en mémoire' },
  'params.persistenceDesc': { en: 'Changes are applied immediately but will be lost on server restart. To make changes permanent, edit the application.properties file.', fr: 'Les modifications sont appliquées immédiatement mais seront perdues au redémarrage du serveur. Pour rendre les changements permanents, modifiez le fichier application.properties.' },

  // ── Toast Messages ───────────────────────────────
  'toast.syncSuccess': { en: 'H2 synchronization completed successfully', fr: 'Synchronisation H2 terminée avec succès' },
  'toast.syncError': { en: 'Synchronization error', fr: 'Erreur lors de la synchronisation' },
  'toast.loadError': { en: 'Unable to load storage structure', fr: 'Impossible de charger la structure de stockage' },
  'toast.renameSuccess': { en: 'File renamed successfully', fr: 'Fichier renommé avec succès' },
  'toast.renameError': { en: 'Error renaming file', fr: 'Erreur lors du renommage' },
  'toast.moveSuccess': { en: 'File moved successfully', fr: 'Fichier déplacé avec succès' },
  'toast.moveError': { en: 'Error moving file', fr: 'Erreur lors du déplacement' },
  'toast.bulkSuccess': { en: 'Bulk rename completed: {count} files modified', fr: 'Renommage en lot terminé : {count} fichiers modifiés' },
  'toast.bulkError': { en: 'Error during bulk rename', fr: 'Erreur lors du renommage en lot' },
  'toast.configSuccess': { en: 'Settings saved successfully', fr: 'Paramètres enregistrés avec succès' },
  'toast.configError': { en: 'Error saving settings', fr: 'Erreur lors de la sauvegarde des paramètres' },
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly lang = signal<Lang>(this.loadLang());

  readonly currentLang = computed(() => this.lang());

  t(key: string, params?: Record<string, string | number>): string {
    const entry = translations[key];
    if (!entry) return key;
    let text = entry[this.lang()] ?? entry['en'] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }

  toggleLang(): void {
    this.setLang(this.lang() === 'en' ? 'fr' : 'en');
  }

  private loadLang(): Lang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'fr' || stored === 'en') return stored;
    } catch {}
    return 'en';
  }
}

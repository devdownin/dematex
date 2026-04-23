export enum DocumentType { VTIS = 'VTIS', FTIS = 'FTIS', PTIS = 'PTIS', CRMENS = 'CRMENS' }
export enum ClientType { B2C = 'B2C', B2BD = 'B2BD', B2BI = 'B2BI', B2G = 'B2G' }
export enum AcknowledgementType { AR0 = 'AR0', AR2 = 'AR2', AR3 = 'AR3', AR4 = 'AR4' }
export enum AlertType { MISSING_RECEPTION = 'MISSING_RECEPTION', AMOUNT_DISCREPANCY = 'AMOUNT_DISCREPANCY', MISSING_AR = 'MISSING_AR' }
export interface DocumentDTO { documentId: string; type: DocumentType; clientType: ClientType; entityCode: string; issuerCode: string; period: string; status: AcknowledgementType; createdAt: string; updatedAt: string; deadline: string; isLate: boolean; hash?: string; }
export interface PaginatedResponse<T> { items: T[]; nextCursor: string | null; hasMore: boolean; totalCount: number; }
export interface Acknowledgement { id: number; documentId: string; entityCode: string; type: AcknowledgementType; timestamp: string; details: string; }
export interface DashboardStats { totalDocuments: number; ar3Completed: number; ar3Pending: number; ar3CompletionRate: number; lateDocuments: number; }
export interface Alert { id: number; fingerprint: string; type: AlertType; code: string; title: string; message: string; documentId?: string; entityCode?: string; issuerCode?: string; period?: string; detectedAt: string; resolvedAt?: string | null; }
export interface AlertSummary { activeAlerts: number; documentAlerts: number; missingArAlerts: number; missingReceptionAlerts: number; amountDiscrepancyAlerts: number; }
export interface SignedDownloadLink { url: string; expiresAt: string; }

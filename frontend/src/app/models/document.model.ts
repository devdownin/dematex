export enum DocumentType { VTIS = 'VTIS', FTIS = 'FTIS', PTIS = 'PTIS', CRMENS = 'CRMENS' }
export enum ClientType { B2C = 'B2C', B2BD = 'B2BD', B2BI = 'B2BI', B2G = 'B2G' }
export enum AcknowledgementType { AR0 = 'AR0', AR2 = 'AR2', AR3 = 'AR3', AR4 = 'AR4' }
export enum AlertType { MISSING_RECEPTION = 'MISSING_RECEPTION', AMOUNT_DISCREPANCY = 'AMOUNT_DISCREPANCY', MISSING_AR = 'MISSING_AR' }
export interface DocumentDTO { documentId: string; type: DocumentType; clientType: ClientType; entityCode: string; issuerCode: string; period: string; status: AcknowledgementType; createdAt: string; updatedAt: string; deadline: string; isLate: boolean; hash?: string; }
export interface PaginatedResponse<T> { items: T[]; nextCursor: string | null; hasMore: boolean; totalCount: number; }
export interface AuditLog { id: number; timestamp: string; user: string | null; action: string; resource: string | null; documentId?: string | null; issuerCode?: string | null; entityCode?: string | null; status?: string | null; }
export interface Acknowledgement { id: number; documentId: string; entityCode: string; type: AcknowledgementType; timestamp: string; details: string; }
export interface DashboardStats { totalDocuments: number; ar3Completed: number; ar3Pending: number; ar3CompletionRate: number; lateDocuments: number; }
export interface Alert { id: number; fingerprint: string; type: AlertType; code: string; title: string; message: string; documentId?: string; entityCode?: string; issuerCode?: string; period?: string; detectedAt: string; resolvedAt?: string | null; }
export interface AlertSummary { activeAlerts: number; documentAlerts: number; missingArAlerts: number; missingReceptionAlerts: number; amountDiscrepancyAlerts: number; }
export interface SignedDownloadLink { url: string; expiresAt: string; }
export interface UploadDocumentResponse { path: string; status: string; }

export interface DeliveryDTO {
  fileId: string; issuer: string; entity: string; type: string; period: string;
  status: AcknowledgementType; updatedAt: string; receivedAt: string;
  size: number | null; sha256: string | null; originalFilename: string | null;
  mimeType: string | null; isLate: boolean; deadline: string | null; downloadUrl: string;
}

export interface AcknowledgementResultDTO {
  documentId: string; status: AcknowledgementType; idempotencyKey: string | null;
  appliedAt: string; alreadyApplied: boolean;
}

export interface BatchAckItem {
  documentId: string; ackType: AcknowledgementType; idempotencyKey?: string;
  externalReference?: string; ackTimestamp?: string; comment?: string;
}

export interface BatchItemResult {
  documentId: string; idempotencyKey: string | null; ackType: AcknowledgementType;
  previousStatus: AcknowledgementType | null; resultStatus: 'OK' | 'ALREADY_APPLIED' | 'ERROR';
  alreadyApplied: boolean; appliedAt: string | null; errorCode: string | null; errorMessage: string | null;
}

export interface BatchAcknowledgementResult {
  total: number; succeeded: number; failed: number; items: BatchItemResult[];
}

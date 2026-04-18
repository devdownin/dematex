export enum DocumentType { VTIS = 'VTIS', FTIS = 'FTIS', PTIS = 'PTIS', REFERENTIEL = 'REFERENTIEL' }
export enum AcknowledgementType { AR0 = 'AR0', AR2 = 'AR2', AR3 = 'AR3', AR4 = 'AR4' }
export interface DocumentDTO { documentId: string; type: DocumentType; entityCode: string; issuerCode: string; period: string; status: AcknowledgementType; createdAt: string; updatedAt: string; }
export interface PaginatedResponse<T> { items: T[]; nextCursor: string | null; hasMore: boolean; }
export interface Acknowledgement { id: number; documentId: string; entityCode: string; type: AcknowledgementType; timestamp: string; details: string; }
export interface DashboardStats { totalDocuments: number; ar3Completed: number; ar3Pending: number; ar3CompletionRate: number; }

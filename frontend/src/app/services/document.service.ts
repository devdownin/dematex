import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentDTO, PaginatedResponse, Acknowledgement, DashboardStats, Alert, AlertSummary, SignedDownloadLink, AuditLog, AcknowledgementType, UploadDocumentResponse, DeliveryDTO, AcknowledgementResultDTO, BatchAckItem, BatchAcknowledgementResult } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private apiUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  getDocuments(entityCode: string, params: any): Observable<PaginatedResponse<DocumentDTO>> {
    return this.http.get<PaginatedResponse<DocumentDTO>>(`${this.apiUrl}/entities/${entityCode}/documents`, { params: this.buildHttpParams(params) });
  }

  searchDocuments(query: string, params: Record<string, string | number | boolean | null | undefined>): Observable<PaginatedResponse<DocumentDTO>> {
    const allParams = { ...params, q: query };
    return this.http.get<PaginatedResponse<DocumentDTO>>(`${this.apiUrl}/search`, { params: this.buildHttpParams(allParams) });
  }

  getDocument(documentId: string): Observable<DocumentDTO> {
    return this.http.get<DocumentDTO>(`${this.apiUrl}/documents/${documentId}`);
  }

  getAcknowledgements(documentId: string): Observable<Acknowledgement[]> {
    return this.http.get<Acknowledgement[]>(`${this.apiUrl}/documents/${documentId}/acknowledgements`);
  }

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  getAuditLogs(params: Record<string, string | number | boolean | null | undefined> = {}): Observable<PaginatedResponse<AuditLog>> {
    return this.http.get<PaginatedResponse<AuditLog>>(`${this.apiUrl}/audit`, { params: this.buildHttpParams(params) });
  }

  exportDocuments(entityCode: string, params: Record<string, string | number | boolean | null | undefined>): Observable<Blob> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get(`${this.apiUrl}/entities/${entityCode}/documents/export`, { params: httpParams, responseType: 'blob' });
  }

  exportAuditLogs(params: Record<string, string | number | boolean | null | undefined> = {}): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/audit/export`, { params: this.buildHttpParams(params), responseType: 'blob' });
  }

  getLatencyTrends(granularity: string = 'daily'): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stats/latency-trends`, {
      params: { granularity }
    });
  }

  getAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.apiUrl}/alerts`);
  }

  getAlertSummary(): Observable<AlertSummary> {
    return this.http.get<AlertSummary>(`${this.apiUrl}/alerts/summary`);
  }

  getDocumentContent(documentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${documentId}/content`, { responseType: 'blob' });
  }

  getSignedDownloadLink(documentId: string): Observable<SignedDownloadLink> {
    return this.http.get<SignedDownloadLink>(`${this.apiUrl}/documents/${documentId}/download-link`);
  }

  downloadSignedContent(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  addAcknowledgement(entityCode: string, documentId: string, payload: { type: AcknowledgementType; details: string }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/entities/${entityCode}/documents/${documentId}/acknowledgements`, payload);
  }

  uploadDocument(formData: FormData): Observable<UploadDocumentResponse> {
    return this.http.post<UploadDocumentResponse>(`${this.apiUrl}/documents/upload`, formData);
  }

  getDeliveries(params: { since?: string; cursor?: string; limit?: number; entityCode?: string }): Observable<PaginatedResponse<DeliveryDTO>> {
    return this.http.get<PaginatedResponse<DeliveryDTO>>(`${this.apiUrl}/deliveries`, { params: this.buildHttpParams(params) });
  }

  downloadContent(documentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${documentId}/content`, { responseType: 'blob' });
  }

  putAcknowledgement(
    documentId: string,
    payload: { ackType: AcknowledgementType; externalReference?: string; ackTimestamp?: string; comment?: string },
    idempotencyKey?: string
  ): Observable<AcknowledgementResultDTO> {
    const headers = idempotencyKey ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) : undefined;
    return this.http.put<AcknowledgementResultDTO>(`${this.apiUrl}/documents/${documentId}/acknowledgement`, payload, { headers });
  }

  batchAcknowledge(items: BatchAckItem[]): Observable<BatchAcknowledgementResult> {
    return this.http.post<BatchAcknowledgementResult>(`${this.apiUrl}/acknowledgements/batch`, { items });
  }

  private buildHttpParams(params: Record<string, string | number | boolean | null | undefined>): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return httpParams;
  }
}

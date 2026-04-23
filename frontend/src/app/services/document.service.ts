import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentDTO, PaginatedResponse, Acknowledgement, DashboardStats, Alert, AlertSummary, SignedDownloadLink } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private apiUrl = '/api/v1';

  constructor(private http: HttpClient) {}

  getDocuments(entityCode: string, params: any): Observable<PaginatedResponse<DocumentDTO>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    return this.http.get<PaginatedResponse<DocumentDTO>>(`${this.apiUrl}/entities/${entityCode}/documents`, { params: httpParams });
  }

  searchDocuments(query: string, params: Record<string, string | number | boolean | null | undefined>): Observable<PaginatedResponse<DocumentDTO>> {
    let httpParams = new HttpParams().set('q', query);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });
    return this.http.get<PaginatedResponse<DocumentDTO>>(`${this.apiUrl}/search`, { params: httpParams });
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

  getAuditLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/audit`);
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

  exportAuditLogs(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/audit/export`, { responseType: 'blob' });
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
}

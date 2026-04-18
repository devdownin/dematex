import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentDTO, PaginatedResponse, Acknowledgement, DocumentType, AcknowledgementType, DashboardStats } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private apiUrl = '/api/v1';
  constructor(private http: HttpClient) { }

  getDocuments(entityCode: string, params: any): Observable<PaginatedResponse<DocumentDTO>> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => { if (params[key]) httpParams = httpParams.set(key, params[key]); });
    return this.http.get<PaginatedResponse<DocumentDTO>>(`${this.apiUrl}/entities/${entityCode}/documents`, { params: httpParams });
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

  getDocumentContent(documentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${documentId}/content`, { responseType: 'blob' });
  }
}

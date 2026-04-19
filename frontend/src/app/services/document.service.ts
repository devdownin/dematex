import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentDTO, PaginatedResponse, Acknowledgement, DocumentType, AcknowledgementType, DashboardStats } from '../models/document.model';

/**
 * Service gérant les appels API pour les documents réglementaires.
 * Centralise la communication avec le backend (BFF).
 */
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private apiUrl = '/api/v1';

  constructor(private http: HttpClient) { }

  /**
   * Récupère une liste de documents pour une entité donnée.
   * @param entityCode Le code juridique de l'entité.
   * @param params Filtres optionnels (type, status, cursor, lateOnly).
   */
  getDocuments(entityCode: string, params: any): Observable<PaginatedResponse<DocumentDTO>> {
    let httpParams = new HttpParams();
    // Transformation des clés d'objet en paramètres de requête HTTP
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
    return this.http.get<PaginatedResponse<DocumentDTO>>(`${this.apiUrl}/entities/${entityCode}/documents`, { params: httpParams });
  }

  /** Récupère les détails complets d'un document unique. */
  getDocument(documentId: string): Observable<DocumentDTO> {
    return this.http.get<DocumentDTO>(`${this.apiUrl}/documents/${documentId}`);
  }

  /** Récupère l'historique des accusés de réception. */
  getAcknowledgements(documentId: string): Observable<Acknowledgement[]> {
    return this.http.get<Acknowledgement[]>(`${this.apiUrl}/documents/${documentId}/acknowledgements`);
  }

  /** Récupère les indicateurs clés (KPI) pour le tableau de bord. */
  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  /** Télécharge le contenu binaire du document. */
  getDocumentContent(documentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${documentId}/content`, { responseType: 'blob' });
  }
}

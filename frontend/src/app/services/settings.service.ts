import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FileNode {
  filename: string;
  baseName: string;
  extension: string;
  size?: string;
  lastModified?: string;
}

export interface TypeNode {
  name: string;
  files: FileNode[];
  fileCount: number;
}

export interface EntityNode {
  name: string;
  types: TypeNode[];
}

export interface IssuerNode {
  name: string;
  entities: EntityNode[];
}

export interface StorageStructure {
  rootPath: string;
  issuers: IssuerNode[];
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private apiUrl = '/api/v1/settings';

  constructor(private http: HttpClient) {}

  getStorageStructure(): Observable<StorageStructure> {
    return this.http.get<StorageStructure>(`${this.apiUrl}/storage/structure`);
  }

  renameFile(documentId: string, newName: string, newExtension: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/storage/rename`, { documentId, newName, newExtension });
  }

  moveFiles(documentIds: string[], targetIssuer: string, targetEntity: string, targetType: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/storage/move`, { documentIds, targetIssuer, targetEntity, targetType });
  }

  bulkRename(issuer: string, entity: string, type: string, fromExtension: string, toExtension: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/storage/bulk-rename`, { issuer, entity, type, fromExtension, toExtension });
  }

  triggerSync(): Observable<any> {
    return this.http.post(`${this.apiUrl}/storage/sync`, {});
  }
}

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

  getIssuers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/storage/issuers`);
  }

  getEntities(issuer: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/storage/issuers/${issuer}/entities`);
  }

  getTypes(issuer: string, entity: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/storage/issuers/${issuer}/entities/${entity}/types`);
  }

  getFiles(issuer: string, entity: string, type: string): Observable<FileNode[]> {
    return this.http.get<FileNode[]>(`${this.apiUrl}/storage/issuers/${issuer}/entities/${entity}/types/${type}/files`);
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

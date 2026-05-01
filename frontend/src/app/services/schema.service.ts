import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SchemaService {
  private apiUrl = '/api/v1/schemas';

  constructor(private http: HttpClient) {}

  listSchemas(): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>(`${this.apiUrl}`);
  }

  downloadSchema(type: string, version: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${type}/${version}`, { responseType: 'blob' });
  }

  downloadLatestSchema(type: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${type}/latest`, { responseType: 'blob' });
  }
}

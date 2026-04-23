import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, catchError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'dematex-token';
  readonly token = signal<string | null>(this.loadToken());

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post<{ token: string }>('/api/v1/auth/login', { username, password }).pipe(
      tap(res => {
        this.token.set(res.token);
        try { localStorage.setItem(this.TOKEN_KEY, res.token); } catch {}
      })
    );
  }

  /** Auto-login with default admin account for development. */
  autoLogin(): Observable<any> {
    const existing = this.token();
    if (existing) {
      // Verify existing token is still valid
      return this.http.get('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${existing}` }
      }).pipe(
        catchError(() => {
          this.clearToken();
          return this.login('admin', 'admin');
        })
      );
    }
    return this.login('admin', 'admin');
  }

  logout(): void {
    const t = this.token();
    if (t) {
      this.http.post('/api/v1/auth/logout', {}, {
        headers: { Authorization: `Bearer ${t}` }
      }).subscribe();
    }
    this.clearToken();
  }

  private clearToken(): void {
    this.token.set(null);
    try { localStorage.removeItem(this.TOKEN_KEY); } catch {}
  }

  private loadToken(): string | null {
    try { return localStorage.getItem(this.TOKEN_KEY); } catch { return null; }
  }
}

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, catchError, switchMap } from 'rxjs';

export interface UserProfile {
  username: string;
  fullName: string;
  role: string;
  allowedIssuer: string | null;
  legalEntityCode: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'dematex-token';
  readonly token = signal<string | null>(this.loadToken());
  readonly user = signal<UserProfile | null>(null);

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post<{ token: string }>('/api/v1/auth/login', { username, password }).pipe(
      tap(res => {
        this.token.set(res.token);
        try { localStorage.setItem(this.TOKEN_KEY, res.token); } catch {}
      }),
      switchMap(() => this.fetchMe())
    );
  }

  fetchMe(): Observable<UserProfile> {
    return this.http.get<UserProfile>('/api/v1/auth/me').pipe(
      tap(user => this.user.set(user))
    );
  }

  /** Auto-login if a token exists. */
  autoLogin(): Observable<any> {
    const existing = this.token();
    if (existing) {
      // Verify existing token is still valid
      return this.fetchMe().pipe(
        catchError(() => {
          this.clearToken();
          return of(null);
        })
      );
    }
    return of(null);
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
    this.user.set(null);
    try { localStorage.removeItem(this.TOKEN_KEY); } catch {}
  }

  private loadToken(): string | null {
    try { return localStorage.getItem(this.TOKEN_KEY); } catch { return null; }
  }
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { AuthService, UserProfile } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockHttp: any;

  const mockUser: UserProfile = {
    username: 'testuser',
    fullName: 'Test User',
    role: 'ROLE_USER',
    allowedIssuer: 'Indigo',
    legalEntityCode: null
  };

  beforeEach(() => {
    mockHttp = {
      get: (url: string) => {
        if (url === '/api/v1/auth/me') return of(mockUser);
        return of({});
      },
      post: (url: string, body: any) => {
        if (url === '/api/v1/auth/login') return of({ token: 'fake-token' });
        return of({});
      }
    };
    service = new AuthService(mockHttp);
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login and set token/user', () => {
    service.login('testuser', 'password').subscribe(user => {
      expect(user).toEqual(mockUser);
      expect(service.token()).toBe('fake-token');
      expect(service.user()).toEqual(mockUser);
    });
  });

  it('should logout and clear token/user', () => {
    service.token.set('fake-token');
    service.user.set(mockUser);

    service.logout();

    expect(service.token()).toBeNull();
    expect(service.user()).toBeNull();
  });

  it('should fetch current user info', () => {
    service.fetchMe().subscribe(user => {
      expect(user).toEqual(mockUser);
      expect(service.user()).toEqual(mockUser);
    });
  });

  it('should auto-login if token exists', () => {
    localStorage.setItem('dematex-token', 'existing-token');
    // The signal state in constructor is test-dependent, but we manually set it.
    service.token.set('existing-token');

    service.autoLogin().subscribe(user => {
      expect(user).toEqual(mockUser);
    });
  });
});

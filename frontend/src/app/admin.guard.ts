import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.user();
  if (user && user.role === 'ROLE_ADMIN') {
    return true;
  }

  // If not admin, redirect to dashboard
  return router.parseUrl('/dashboard');
};

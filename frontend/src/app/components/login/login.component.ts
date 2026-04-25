import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { ConfigService } from '../../services/config.service';
import { AuthService, AvailableProfile } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[radial-gradient(circle_at_top,_#e7eef6_0%,_#f8fafc_42%,_#e2e8f0_100%)] text-slate-900">
      <div class="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-10 lg:px-8">
        <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section class="rounded-[2rem] border border-white/70 bg-white/70 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div class="mb-10 flex items-center gap-4">
              <div class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#00152a]" *ngIf="config()?.logoUrl; else logoFallback">
                <img [src]="config()?.logoUrl" [alt]="config()?.companyName || 'Dematex'" class="h-full w-full object-cover" />
              </div>
              <ng-template #logoFallback>
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00152a] text-lg font-black tracking-widest text-white">
                  DX
                </div>
              </ng-template>
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{{ t('auth.badge') }}</p>
                <h1 class="text-3xl font-black tracking-tight text-slate-950">{{ config()?.companyName || 'Dematex' }}</h1>
              </div>
            </div>

            <div class="max-w-xl space-y-5">
              <h2 class="text-4xl font-black leading-tight tracking-tight text-slate-950">{{ t('auth.title') }}</h2>
              <p class="text-base leading-7 text-slate-600">{{ t('auth.subtitle') }}</p>
              <div class="grid gap-4 pt-4 sm:grid-cols-3">
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{{ t('auth.feature.access') }}</p>
                  <p class="mt-2 text-sm font-semibold text-slate-900">{{ t('auth.feature.accessValue') }}</p>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{{ t('auth.feature.traceability') }}</p>
                  <p class="mt-2 text-sm font-semibold text-slate-900">{{ t('auth.feature.traceabilityValue') }}</p>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{{ t('auth.feature.scope') }}</p>
                  <p class="mt-2 text-sm font-semibold text-slate-900">{{ t('auth.feature.scopeValue') }}</p>
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-[2rem] bg-[#0f172a] p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div class="mx-auto max-w-md">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{{ t('auth.signInPanel') }}</p>
              <form class="mt-6 space-y-5" (ngSubmit)="submit()">
                <div>
                  <label class="mb-2 block text-sm font-semibold text-slate-200" for="username">{{ t('auth.username') }}</label>
                  <input
                    id="username"
                    name="username"
                    [(ngModel)]="username"
                    class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none transition focus:border-slate-500"
                    [placeholder]="t('auth.usernamePlaceholder')"
                    autocomplete="username"
                    required
                  />
                </div>

                <div>
                  <label class="mb-2 block text-sm font-semibold text-slate-200" for="password">{{ t('auth.password') }}</label>
                  <input
                    id="password"
                    name="password"
                    [(ngModel)]="password"
                    class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none transition focus:border-slate-500"
                    [placeholder]="t('auth.passwordPlaceholder')"
                    type="password"
                    autocomplete="current-password"
                    required
                  />
                </div>

                <p *ngIf="errorMessage" class="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {{ errorMessage }}
                </p>

                <button
                  type="submit"
                  class="w-full rounded-2xl bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  [disabled]="loading || !username.trim() || !password.trim()"
                >
                  {{ loading ? t('auth.signingIn') : t('auth.signIn') }}
                </button>
              </form>

              <div class="mt-8 border-t border-slate-800 pt-6" *ngIf="profiles.length">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-bold text-white">{{ t('auth.demoProfiles') }}</h3>
                    <p class="mt-1 text-sm text-slate-400">{{ t('auth.demoHint') }}</p>
                  </div>
                </div>

                <div class="mt-4 space-y-3">
                  <button
                    *ngFor="let profile of profiles"
                    type="button"
                    (click)="applyProfile(profile)"
                    class="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-left transition hover:border-slate-600 hover:bg-slate-900"
                  >
                    <div>
                      <p class="text-sm font-semibold text-white">{{ profile.fullName }}</p>
                      <p class="text-xs uppercase tracking-[0.18em] text-slate-400">
                        {{ profile.username }} · {{ profile.role }}
                      </p>
                    </div>
                    <span class="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">{{ t('auth.useProfile') }}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  readonly config;
  username = '';
  password = '';
  loading = false;
  errorMessage = '';
  profiles: AvailableProfile[] = [];

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private translationService: TranslationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.config = this.configService.config;

    if (this.authService.isAuthenticated()) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.authService.getProfiles().pipe(
      catchError(() => of([] as AvailableProfile[]))
    ).subscribe(profiles => {
      this.profiles = profiles;
    });
  }

  t(key: string): string {
    return this.translationService.t(key);
  }

  applyProfile(profile: AvailableProfile): void {
    this.username = profile.username;
    this.password = profile.username;
    this.errorMessage = '';
  }

  submit(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.username.trim(), this.password).pipe(
      finalize(() => {
        this.loading = false;
      }),
      catchError(() => {
        this.errorMessage = this.t('auth.invalidCredentials');
        return of(null);
      })
    ).subscribe(user => {
      if (!user) {
        return;
      }

      const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') || '/dashboard';
      void this.router.navigateByUrl(redirectTo);
    });
  }
}

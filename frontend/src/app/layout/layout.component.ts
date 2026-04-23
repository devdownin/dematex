import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ConfigService } from '../services/config.service';
import { AuthService } from '../services/auth.service';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="flex min-h-screen text-[#171c1f] antialiased bg-[#f6fafe]">
      <!-- SideNavBar -->
      <aside class="hidden md:flex flex-col h-screen w-64 bg-slate-100 py-6 px-4 space-y-2 sticky top-0 font-['Inter'] text-sm tracking-wide border-r border-slate-200">
        <div class="flex items-center gap-3 px-2 mb-8">
          <div class="w-10 h-10 rounded-lg bg-[#00152a] flex items-center justify-center overflow-hidden" *ngIf="config()?.logoUrl">
            <img alt="Portal Logo" [src]="config()?.logoUrl" />
          </div>
          <div>
            <h2 class="font-bold text-slate-900 leading-tight">{{ config()?.companyName || 'Guichet Unique' }}</h2>
            <p class="text-[10px] text-[#43474d] font-semibold tracking-widest uppercase">{{ t('nav.subtitle') }}</p>
          </div>
        </div>
        <nav class="flex-grow space-y-1">
          <a routerLink="/dashboard" routerLinkActive="bg-white text-slate-950 font-semibold shadow-sm" class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all">
            <span class="material-symbols-outlined" [class.filled]="isLinkActive('/dashboard')">dashboard</span>
            {{ t('nav.dashboard') }}
          </a>
          <a routerLink="/documents" routerLinkActive="bg-white text-slate-950 font-semibold shadow-sm" class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all">
            <span class="material-symbols-outlined" [class.filled]="isLinkActive('/documents')">table_chart</span>
            {{ t('nav.documents') }}
          </a>
          <a routerLink="/alerts" routerLinkActive="bg-white text-slate-950 font-semibold shadow-sm" class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all">
            <span class="material-symbols-outlined" [class.filled]="isLinkActive('/alerts')">warning</span>
            {{ t('nav.alerts') }}
          </a>
          <a routerLink="/audit" routerLinkActive="bg-white text-slate-950 font-semibold shadow-sm" class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all">
            <span class="material-symbols-outlined" [class.filled]="isLinkActive('/audit')">history_edu</span>
            {{ t('nav.audit') }}
          </a>
          <a class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all" href="/swagger-ui/index.html" target="_blank" *ngIf="isAdmin()">
            <span class="material-symbols-outlined">api</span>
            {{ t('nav.api') }}
          </a>
          <a routerLink="/settings" routerLinkActive="bg-white text-slate-950 font-semibold shadow-sm" class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all" *ngIf="isAdmin()">
            <span class="material-symbols-outlined" [class.filled]="isLinkActive('/settings')">settings_input_component</span>
            {{ t('nav.settings') }}
          </a>
        </nav>
        <button class="mt-4 mx-2 px-4 py-3 bg-[#00152a] text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[0.98] active:scale-95 shadow-lg shadow-primary/20">
          <span class="material-symbols-outlined text-sm">add</span>
          {{ t('nav.newDocument') }}
        </button>
        <div class="pt-6 border-t border-slate-200 space-y-1">
          <a class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all" href="#">
            <span class="material-symbols-outlined">help_outline</span>
            {{ t('nav.support') }}
          </a>
          <a class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all" href="#">
            <span class="material-symbols-outlined">logout</span>
            {{ t('nav.logout') }}
          </a>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col min-w-0">
        <!-- TopNavBar -->
        <header class="flex justify-between items-center px-8 py-4 w-full bg-slate-50 sticky top-0 z-50 font-['Inter'] antialiased tracking-tight border-b border-slate-200">
          <div class="flex items-center gap-6">
            <h1 class="text-xl font-black tracking-tighter text-slate-900">{{ config()?.companyName || 'Sovereign Ledger' }}</h1>
            <div class="relative hidden sm:block">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <span class="material-symbols-outlined text-sm">search</span>
              </span>
              <input
                [(ngModel)]="searchQuery"
                (keyup.enter)="submitSearch()"
                class="bg-[#f0f4f8] border-none rounded-full py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#00152a]/10 w-64 transition-all"
                [placeholder]="t('nav.search')"
                type="text"
              />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- Language Toggle -->
            <button (click)="toggleLang()" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/40 rounded-full transition-all" title="Switch language">
              <span class="material-symbols-outlined text-sm">translate</span>
              <span class="uppercase">{{ currentLang() }}</span>
            </button>
            <button class="p-2 text-slate-500 hover:bg-slate-200/40 rounded-full transition-all">
              <span class="material-symbols-outlined">notifications</span>
            </button>
            <div class="flex items-center gap-3 ml-2">
              <div class="hidden lg:block text-right">
                <p class="text-[11px] font-bold text-slate-900 leading-none">{{ user()?.fullName }}</p>
                <p class="text-[9px] text-slate-500 font-medium uppercase tracking-wider">{{ user()?.role }}</p>
              </div>
              <div class="h-8 w-8 rounded-full bg-[#e4e9ed] overflow-hidden cursor-pointer ring-2 ring-offset-2 ring-slate-200">
                <img alt="User Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxoTUJTkRPs0T-i9WgggXTG7jxDkS0LIiCgfwBi-vge-2KJpVRxMG0ybXohN-BTw7lrQzHkxvfWaQjDhEFfWHOyYybRDhFwFwLBj2XtkDdloLZgyfEJdD934S0qmjzdSPXr88f_hnASuolmCiCFE8plJRnw1KbOekw0_7iCfn8V8jgc4ghGAVPyK1lKDP2YvTi_DhxCCJM5Aa_JW7MhRqd2oHmIxLfepX5TBknFKCFqGhgaUIfnku_-DZtwSeq5Td8Yw7A9sxZjk0" />
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="flex-1 overflow-auto">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .material-symbols-outlined.filled {
      font-variation-settings: 'FILL' 1;
    }
  `]
})
export class LayoutComponent {
  config;
  currentLang;
  user;
  searchQuery = '';

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private translationService: TranslationService,
    private router: Router
  ) {
    this.config = this.configService.config;
    this.user = this.authService.user;
    this.currentLang = this.translationService.lang;
  }

  isAdmin(): boolean {
    return this.user()?.role === 'ROLE_ADMIN';
  }

  t(key: string): string {
    return this.translationService.t(key);
  }

  toggleLang(): void {
    this.translationService.toggleLang();
  }

  isLinkActive(path: string): boolean {
    return this.router.url.startsWith(path);
  }

  submitSearch(): void {
    const trimmed = this.searchQuery.trim();
    this.router.navigate(['/documents'], {
      queryParams: trimmed ? { q: trimmed } : {}
    });
  }
}

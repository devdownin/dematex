import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ConfigService } from '../services/config.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
            <p class="text-[10px] text-[#43474d] font-semibold tracking-widest uppercase">Regulatory Supervision</p>
          </div>
        </div>
        <nav class="flex-grow space-y-1">
          <a routerLink="/dashboard" routerLinkActive="bg-white text-slate-950 font-semibold shadow-sm" class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all">
            <span class="material-symbols-outlined" [class.filled]="isLinkActive('/dashboard')">dashboard</span>
            Dashboard
          </a>
          <a routerLink="/documents" routerLinkActive="bg-white text-slate-950 font-semibold shadow-sm" class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all">
            <span class="material-symbols-outlined" [class.filled]="isLinkActive('/documents')">table_chart</span>
            Document Catalog
          </a>
          <a routerLink="/audit" routerLinkActive="bg-white text-slate-950 font-semibold shadow-sm" class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all">
            <span class="material-symbols-outlined" [class.filled]="isLinkActive('/audit')">history_edu</span>
            Audit Log
          </a>
          <a class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all" href="/swagger-ui/index.html" target="_blank">
            <span class="material-symbols-outlined">api</span>
            API Documentation
          </a>
          <a class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all" href="#">
            <span class="material-symbols-outlined">settings_input_component</span>
            System Settings
          </a>
        </nav>
        <button class="mt-4 mx-2 px-4 py-3 bg-[#00152a] text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[0.98] active:scale-95 shadow-lg shadow-primary/20">
          <span class="material-symbols-outlined text-sm">add</span>
          New Document
        </button>
        <div class="pt-6 border-t border-slate-200 space-y-1">
          <a class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all" href="#">
            <span class="material-symbols-outlined">help_outline</span>
            Support
          </a>
          <a class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-all" href="#">
            <span class="material-symbols-outlined">logout</span>
            Logout
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
              <input class="bg-[#f0f4f8] border-none rounded-full py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#00152a]/10 w-64 transition-all" placeholder="Search transactions..." type="text"/>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <button class="p-2 text-slate-500 hover:bg-slate-200/40 rounded-full transition-all">
              <span class="material-symbols-outlined">notifications</span>
            </button>
            <button class="p-2 text-slate-500 hover:bg-slate-200/40 rounded-full transition-all">
              <span class="material-symbols-outlined">settings</span>
            </button>
            <div class="h-8 w-8 rounded-full bg-[#e4e9ed] overflow-hidden cursor-pointer ring-2 ring-offset-2 ring-slate-200">
              <img alt="Administrator Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxoTUJTkRPs0T-i9WgggXTG7jxDkS0LIiCgfwBi-vge-2KJpVRxMG0ybXohN-BTw7lrQzHkxvfWaQjDhEFfWHOyYybRDhFwFwLBj2XtkDdloLZgyfEJdD934S0qmjzdSPXr88f_hnASuolmCiCFE8plJRnw1KbOekw0_7iCfn8V8jgc4ghGAVPyK1lKDP2YvTi_DhxCCJM5Aa_JW7MhRqd2oHmIxLfepX5TBknFKCFqGhgaUIfnku_-DZtwSeq5Td8Yw7A9sxZjk0" />
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
  constructor(private configService: ConfigService, private router: Router) {
    this.config = this.configService.config;
  }

  isLinkActive(path: string): boolean {
    return this.router.url.startsWith(path);
  }
}

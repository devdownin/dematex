import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../../services/document.service';
import { TranslationService } from '../../services/translation.service';
import { AuditLog } from '../../models/document.model';

@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-8 space-y-8 font-['Inter']">
      <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <p class="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">{{ t('audit.badge') }}</p>
          <h2 class="text-4xl font-black tracking-tight text-on-surface">{{ t('audit.title') }}</h2>
          <p class="text-on-surface-variant font-medium mt-1">{{ t('audit.subtitle') }}</p>
        </div>
        <div class="flex gap-3">
          <button (click)="exportAudit()" class="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all shadow-lg shadow-primary/20">
            <span class="material-symbols-outlined text-sm">ios_share</span>
            {{ t('audit.exportAudit') }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div class="lg:col-span-3 space-y-6">
          <form class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4" (ngSubmit)="applyFilters()">
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-bold text-on-surface uppercase tracking-tight text-sm">{{ t('audit.filters') }}</h3>
              <span class="text-xs font-semibold text-on-surface-variant">{{ logs.length }} / {{ totalCount }}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label class="space-y-2 text-xs font-semibold text-on-surface-variant">
                <span>{{ t('audit.filterUser') }}</span>
                <select [(ngModel)]="filters.user" name="user" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-on-surface bg-white">
                  <option value="">{{ t('common.all') }}</option>
                  <option *ngFor="let user of availableUsers" [value]="user">{{ user }}</option>
                </select>
              </label>
              <label class="space-y-2 text-xs font-semibold text-on-surface-variant">
                <span>{{ t('audit.filterAction') }}</span>
                <select [(ngModel)]="filters.action" name="action" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-on-surface bg-white">
                  <option value="">{{ t('common.all') }}</option>
                  <option *ngFor="let action of availableActions" [value]="action">{{ action }}</option>
                </select>
              </label>
              <label class="space-y-2 text-xs font-semibold text-on-surface-variant">
                <span>{{ t('audit.filterResource') }}</span>
                <input [(ngModel)]="filters.resource" name="resource" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-on-surface" />
              </label>
            </div>
            <div class="flex flex-wrap gap-3">
              <button type="submit" class="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white text-sm font-bold rounded-lg">
                <span class="material-symbols-outlined text-sm">filter_alt</span>
                {{ t('audit.applyFilters') }}
              </button>
              <button type="button" (click)="resetFilters()" class="px-4 py-2 bg-white text-on-surface text-sm font-bold rounded-lg border border-slate-200 hover:bg-slate-50">
                {{ t('audit.resetFilters') }}
              </button>
            </div>
          </form>

          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="px-6 py-4 bg-surface-container-low border-b border-slate-100">
              <h3 class="font-bold text-on-surface uppercase tracking-tight text-sm">{{ t('audit.recentActivity') }}</h3>
            </div>
            <div *ngIf="errorMessage" class="mx-6 mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {{ errorMessage }}
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead class="bg-surface-container-low text-[10px] font-black uppercase text-on-surface-variant">
                  <tr>
                    <th class="px-6 py-3">{{ t('audit.colTimestamp') }}</th>
                    <th class="px-6 py-3">{{ t('audit.colSubject') }}</th>
                    <th class="px-6 py-3">{{ t('audit.colEventType') }}</th>
                    <th class="px-6 py-3">{{ t('audit.colResource') }}</th>
                    <th class="px-6 py-3">{{ t('audit.colStatus') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr *ngFor="let log of logs; trackBy: trackByLogId" class="zebra-stripe tonal-stack">
                    <td class="px-6 py-4">
                      <div class="text-sm font-bold text-primary">{{log.timestamp | date:'HH:mm:ss'}}</div>
                      <div class="text-[10px] text-on-surface-variant font-medium">{{log.timestamp | date:'dd MMM yyyy'}}</div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">
                          {{ getInitials(log.user) }}
                        </div>
                        <span class="text-xs font-semibold text-on-surface">{{ log.user || 'system' }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span class="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase">{{ log.action }}</span>
                    </td>
                    <td class="px-6 py-4 text-xs font-mono text-on-surface-variant">{{ log.resource || log.documentId || '-' }}</td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-1.5">
                        <div class="w-1.5 h-1.5 rounded-full bg-[#24a375]"></div>
                        <span class="text-[10px] font-bold text-[#24a375]">{{ log.status || t('common.verified') }}</span>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="!loading && logs.length === 0">
                    <td colspan="5" class="px-6 py-10 text-center text-on-surface-variant italic">{{ t('audit.noActivity') }}</td>
                  </tr>
                  <tr *ngIf="loading">
                    <td colspan="5" class="px-6 py-10 text-center text-on-surface-variant italic">{{ t('audit.loading') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="px-6 py-4 border-t border-slate-100" *ngIf="hasMore">
              <button (click)="loadMore()" [disabled]="loading" class="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-on-surface hover:bg-slate-50 disabled:opacity-60">
                {{ loading ? t('audit.loading') : t('audit.loadMore') }}
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-primary p-6 rounded-xl text-white">
            <h4 class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{{ t('audit.integrityStatus') }}</h4>
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-tertiary-fixed-dim">shield_check</span>
              <span class="text-xl font-black">{{ t('audit.secure') }}</span>
            </div>
            <p class="text-xs opacity-80 leading-relaxed">{{ t('audit.integrityDesc') }}</p>
          </div>

          <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h4 class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-6">{{ t('audit.userAccess') }}</h4>
            <div class="space-y-4" *ngIf="distribution">
              <div *ngFor="let item of distribution" class="space-y-2">
                <div class="flex justify-between items-center text-xs">
                  <span class="font-bold">{{item.label}}</span>
                  <span class="font-black">{{item.percentage | number:'1.0-0'}}%</span>
                </div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div [class]="item.color + ' h-full'" [style.width.%]="item.percentage"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class AuditTrailComponent implements OnInit {
  logs: AuditLog[] = [];
  distribution: Array<{ label: string; percentage: number; color: string }> = [];
  filters = { user: '', action: '', resource: '' };
  
  availableUsers = ['system', 'VAUT', 'Indigo', 'REORA', 'REPA'];
  availableActions = [
    'RECEIVE_DOCUMENT',
    'DOWNLOAD_DOCUMENT',
    'ACK_UPDATE',
    'FILE_UPLOAD',
    'FILE_RENAME',
    'FILE_MOVE',
    'BULK_RENAME',
    'EXPORT_DOCUMENTS',
    'EXPORT_AUDIT',
    'PURGE_DOCUMENT',
    'DETECT_ALARM',
    'RESOLVE_ALARM'
  ];

  hasMore = false;
  loading = false;
  errorMessage = '';
  nextCursor: string | null = null;
  totalCount = 0;
  private readonly pageSize = 50;

  constructor(private documentService: DocumentService, private translationService: TranslationService) {}

  t(key: string, params?: Record<string, string | number>): string {
    return this.translationService.t(key, params);
  }

  ngOnInit(): void {
    this.fetchLogs(true);
  }

  applyFilters(): void {
    this.fetchLogs(true);
  }

  resetFilters(): void {
    this.filters = { user: '', action: '', resource: '' };
    this.fetchLogs(true);
  }

  loadMore(): void {
    if (!this.hasMore || this.loading) {
      return;
    }
    this.fetchLogs(false);
  }

  exportAudit(): void {
    this.documentService.exportAuditLogs(this.buildFilterParams()).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'audit-export.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  trackByLogId(_: number, log: AuditLog): number {
    return log.id;
  }

  getInitials(user: string | null): string {
    const value = (user || 'system').trim();
    return value.slice(0, 2).toUpperCase();
  }

  private fetchLogs(reset: boolean): void {
    this.loading = true;
    this.errorMessage = '';

    const params = this.buildFilterParams();
    if (!reset && this.nextCursor) {
      params['cursor'] = this.nextCursor;
    }

    this.documentService.getAuditLogs(params).subscribe({
      next: page => {
        this.logs = reset ? page.items : [...this.logs, ...page.items];
        this.nextCursor = page.nextCursor;
        this.hasMore = page.hasMore;
        this.totalCount = page.totalCount;
        this.calculateDistribution();
      },
      error: () => {
        if (reset) {
          this.logs = [];
          this.distribution = [];
        }
        this.hasMore = false;
        this.nextCursor = null;
        this.totalCount = 0;
        this.errorMessage = this.t('audit.loadError');
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private buildFilterParams(): { limit: number; user?: string; action?: string; resource?: string; cursor?: string } {
    const params: { limit: number; user?: string; action?: string; resource?: string; cursor?: string } = {
      limit: this.pageSize
    };

    if (this.filters.user.trim()) {
      params.user = this.filters.user.trim();
    }
    if (this.filters.action.trim()) {
      params.action = this.filters.action.trim();
    }
    if (this.filters.resource.trim()) {
      params.resource = this.filters.resource.trim();
    }

    return params;
  }

  private calculateDistribution(): void {
    if (!this.logs.length) {
      this.distribution = [];
      return;
    }
    const counts: { [key: string]: number } = {};
    this.logs.forEach(log => {
      const user = log.user || 'system';
      counts[user] = (counts[user] || 0) + 1;
    });

    const total = this.logs.length;
    const colors = ['bg-primary', 'bg-[#44617d]', 'bg-[#24a375]', 'bg-[#ba1a1a]'];
    this.distribution = Object.keys(counts).map((user, i) => ({
      label: user,
      percentage: (counts[user] / total) * 100,
      color: colors[i % colors.length]
    })).sort((a, b) => b.percentage - a.percentage);
  }
}

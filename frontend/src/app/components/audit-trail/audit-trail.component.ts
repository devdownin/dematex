import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService } from '../../services/document.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8 space-y-8 font-['Inter']">
      <!-- Audit Headline -->
      <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <p class="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">{{ t('audit.badge') }}</p>
          <h2 class="text-4xl font-black tracking-tight text-on-surface">{{ t('audit.title') }}</h2>
          <p class="text-on-surface-variant font-medium mt-1">{{ t('audit.subtitle') }}</p>
        </div>
        <div class="flex gap-3">
          <button class="flex items-center gap-2 px-4 py-2 bg-white text-on-surface text-sm font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all">
            <span class="material-symbols-outlined text-sm">filter_alt</span>
            {{ t('audit.filters') }}
          </button>
          <button (click)="exportAudit()" class="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all shadow-lg shadow-primary/20">
            <span class="material-symbols-outlined text-sm">ios_share</span>
            {{ t('audit.exportAudit') }}
          </button>
        </div>
      </div>

      <!-- Compliance Timeline -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div class="lg:col-span-3 space-y-6">
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="px-6 py-4 bg-surface-container-low border-b border-slate-100">
              <h3 class="font-bold text-on-surface uppercase tracking-tight text-sm">{{ t('audit.recentActivity') }}</h3>
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
                  <tr *ngFor="let log of logs" class="zebra-stripe tonal-stack">
                    <td class="px-6 py-4">
                      <div class="text-sm font-bold text-primary">{{log.timestamp | date:'HH:mm:ss'}}</div>
                      <div class="text-[10px] text-on-surface-variant font-medium">{{log.timestamp | date:'dd MMM yyyy'}}</div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">
                          {{log.user.substring(0,2).toUpperCase()}}
                        </div>
                        <span class="text-xs font-semibold text-on-surface">{{log.user}}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span class="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase">{{log.action}}</span>
                    </td>
                    <td class="px-6 py-4 text-xs font-mono text-on-surface-variant">{{log.resource}}</td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-1.5">
                        <div class="w-1.5 h-1.5 rounded-full bg-[#24a375]"></div>
                        <span class="text-[10px] font-bold text-[#24a375]">{{log.status || t('common.verified')}}</span>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="logs.length === 0">
                    <td colspan="5" class="px-6 py-10 text-center text-on-surface-variant italic">{{ t('audit.noActivity') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Compliance Sidebar -->
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
  logs: any[] = [];
  distribution: any[] = [];

  constructor(private documentService: DocumentService, private translationService: TranslationService) {}

  t(key: string, params?: Record<string, string | number>): string {
    return this.translationService.t(key, params);
  }

  ngOnInit(): void {
    this.documentService.getAuditLogs().subscribe(l => {
      this.logs = l;
      this.calculateDistribution();
    });
  }

  exportAudit(): void {
    this.documentService.exportAuditLogs().subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'audit-export.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  private calculateDistribution(): void {
    if (!this.logs.length) return;
    const counts: { [key: string]: number } = {};
    this.logs.forEach(log => {
      const user = log.user || 'Unknown';
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

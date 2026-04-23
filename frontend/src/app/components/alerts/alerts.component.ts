import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Alert, AlertType } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="p-8 space-y-8 font-['Inter']">
      <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <p class="text-[10px] text-[#43474d] font-bold tracking-widest uppercase mb-1">{{ t('alerts.badge') }}</p>
          <h2 class="text-4xl font-black tracking-tight text-[#171c1f]">{{ t('alerts.title') }}</h2>
          <p class="text-[#43474d] font-medium mt-1">{{ t('alerts.subtitle') }}</p>
        </div>
        <div class="bg-[#00152a] text-white px-4 py-3 rounded-xl min-w-44">
          <div class="text-[10px] uppercase tracking-widest opacity-60 font-black">{{ t('alerts.activeNow') }}</div>
          <div class="text-3xl font-black mt-1">{{ alerts.length }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div class="text-[10px] uppercase tracking-widest font-black text-[#43474d]">{{ t('alerts.missingAr') }}</div>
          <div class="text-3xl font-black text-[#ba1a1a] mt-3">{{ countByType(AlertType.MISSING_AR) }}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div class="text-[10px] uppercase tracking-widest font-black text-[#43474d]">{{ t('alerts.missingReception') }}</div>
          <div class="text-3xl font-black text-[#44617d] mt-3">{{ countByType(AlertType.MISSING_RECEPTION) }}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div class="text-[10px] uppercase tracking-widest font-black text-[#43474d]">{{ t('alerts.amountDiscrepancy') }}</div>
          <div class="text-3xl font-black text-[#00152a] mt-3">{{ countByType(AlertType.AMOUNT_DISCREPANCY) }}</div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="px-6 py-4 bg-[#f0f4f8] border-b border-slate-100">
          <h3 class="font-bold text-[#171c1f] uppercase tracking-tight text-sm">{{ t('alerts.recentList') }}</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-[#f8fafc] text-[10px] font-black uppercase text-[#43474d]">
              <tr>
                <th class="px-6 py-3">{{ t('alerts.colCode') }}</th>
                <th class="px-6 py-3">{{ t('alerts.colType') }}</th>
                <th class="px-6 py-3">{{ t('alerts.colScope') }}</th>
                <th class="px-6 py-3">{{ t('alerts.colDetails') }}</th>
                <th class="px-6 py-3">{{ t('alerts.colDetectedAt') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let alert of alerts" class="hover:bg-slate-50/80">
                <td class="px-6 py-4">
                  <div class="text-xs font-black text-[#00152a]">{{ alert.code }}</div>
                  <div class="text-[11px] text-[#43474d] mt-1">{{ alert.title }}</div>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider" [class]="badgeClass(alert.type)">
                    {{ alert.type }}
                  </span>
                </td>
                <td class="px-6 py-4 text-xs text-[#43474d] font-medium">
                  <div>{{ alert.entityCode || 'GLOBAL' }}</div>
                  <div class="text-[11px] mt-1">{{ alert.period || '-' }}</div>
                </td>
                <td class="px-6 py-4 text-xs text-[#43474d]">
                  <div>{{ alert.message }}</div>
                  <a *ngIf="alert.documentId" [routerLink]="['/documents', alert.documentId]" class="inline-flex mt-2 text-[#00152a] font-bold hover:underline">
                    {{ alert.documentId }}
                  </a>
                </td>
                <td class="px-6 py-4 text-xs font-medium text-[#43474d]">{{ alert.detectedAt | date:'dd/MM/yyyy HH:mm' }}</td>
              </tr>
              <tr *ngIf="alerts.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-[#43474d] italic">{{ t('alerts.empty') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class AlertsComponent implements OnInit {
  readonly AlertType = AlertType;
  alerts: Alert[] = [];

  constructor(private documentService: DocumentService, private translationService: TranslationService) {}

  ngOnInit(): void {
    this.documentService.getAlerts().subscribe(alerts => this.alerts = alerts);
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.translationService.t(key, params);
  }

  countByType(type: AlertType): number {
    return this.alerts.filter(alert => alert.type === type).length;
  }

  badgeClass(type: AlertType): string {
    if (type === AlertType.MISSING_AR) return 'bg-[#ffdad6] text-[#93000a]';
    if (type === AlertType.MISSING_RECEPTION) return 'bg-[#e7ecf2] text-[#31485f]';
    return 'bg-[#d6e4ff] text-[#12305b]';
  }
}

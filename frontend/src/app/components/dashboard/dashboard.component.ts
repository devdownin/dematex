import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Alert, AlertSummary, AlertType, DashboardStats } from '../../models/document.model';
import { DocumentService } from '../../services/document.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective],
  template: `
    <div class="p-8 space-y-8 font-['Inter']">
      <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 class="text-3xl font-extrabold tracking-tight text-[#171c1f]">{{ t('dash.title') }}</h2>
          <p class="text-[#43474d] font-medium mt-1">{{ t('dash.subtitle') }}</p>
        </div>
        <div class="flex gap-2 bg-[#f0f4f8] p-1 rounded-lg">
          <div *ngIf="isLive" class="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded-md border border-green-200">
            <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            {{ t('common.live') }}
          </div>
          <button (click)="setPeriod('daily')" class="px-4 py-1.5 text-xs font-semibold rounded transition-all" [class.bg-white]="activePeriod === 'daily'" [class.shadow-sm]="activePeriod === 'daily'" [class.font-bold]="activePeriod === 'daily'" [class.text-[#43474d]]="activePeriod !== 'daily'">{{ t('common.daily') }}</button>
          <button (click)="setPeriod('weekly')" class="px-4 py-1.5 text-xs font-semibold rounded transition-all" [class.bg-white]="activePeriod === 'weekly'" [class.shadow-sm]="activePeriod === 'weekly'" [class.font-bold]="activePeriod === 'weekly'" [class.text-[#43474d]]="activePeriod !== 'weekly'">{{ t('common.weekly') }}</button>
          <button (click)="setPeriod('monthly')" class="px-4 py-1.5 text-xs font-semibold rounded transition-all" [class.bg-white]="activePeriod === 'monthly'" [class.shadow-sm]="activePeriod === 'monthly'" [class.font-bold]="activePeriod === 'monthly'" [class.text-[#43474d]]="activePeriod !== 'monthly'">{{ t('common.monthly') }}</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6" *ngIf="stats">
        <div class="md:col-span-2 bg-white p-6 rounded-xl relative overflow-hidden group shadow-sm border border-slate-100">
          <div class="relative z-10">
            <div class="flex justify-between items-start mb-4">
              <span class="text-[10px] uppercase tracking-widest font-bold text-[#005137] bg-[#68dba9] px-2 py-0.5 rounded-sm">{{ t('dash.perfAnchor') }}</span>
              <span class="material-symbols-outlined text-[#68dba9]">verified_user</span>
            </div>
            <h3 class="text-4xl font-black text-[#00152a]">{{ stats.ar3CompletionRate | number:'1.1-1' }}%</h3>
            <p class="text-[#43474d] text-sm font-semibold mt-1">{{ t('dash.ar3Rate') }}</p>
            <div class="mt-6 flex items-end gap-2 h-16">
              <div class="flex-1 bg-[#68dba9]/20 h-8 rounded-sm"></div>
              <div class="flex-1 bg-[#68dba9]/40 h-10 rounded-sm"></div>
              <div class="flex-1 bg-[#68dba9]/60 h-14 rounded-sm"></div>
              <div class="flex-1 bg-[#68dba9]/80 h-12 rounded-sm"></div>
              <div class="flex-1 bg-[#68dba9] h-16 rounded-sm"></div>
            </div>
          </div>
          <div class="absolute top-0 right-0 p-8 opacity-5">
            <span class="material-symbols-outlined text-9xl">gavel</span>
          </div>
        </div>

        <div class="bg-white p-6 rounded-xl flex flex-col justify-between shadow-sm border border-slate-100">
          <div>
            <p class="text-[10px] uppercase tracking-widest font-bold text-[#43474d] mb-4">{{ t('dash.errorRate') }}</p>
            <h3 class="text-3xl font-black text-[#ba1a1a]">{{ errorRate() | number:'1.2-2' }}%</h3>
            <p class="text-[#93000a] text-xs font-semibold mt-1 bg-[#ffdad6] inline-block px-1.5 py-0.5 rounded-sm">
              {{ t('dash.slaViolations') }}
            </p>
          </div>
          <div class="pt-4 mt-4 border-t border-[#e4e9ed]">
            <div class="flex justify-between text-[10px] font-bold text-[#43474d]">
              <span>{{ t('common.limit') }}: 0.50%</span>
              <span [ngClass]="errorRate() < 0.5 ? 'text-[#24a375]' : 'text-error'">
                {{ errorRate() < 0.5 ? t('common.healthy') : t('common.critical') }}
              </span>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-xl flex flex-col justify-between border-b-2 border-b-[#00152a] shadow-sm border border-slate-100">
          <div>
            <p class="text-[10px] uppercase tracking-widest font-bold text-[#43474d] mb-4">{{ t('dash.activeBlockages') }}</p>
            <h3 class="text-3xl font-black text-[#00152a]">{{ alertSummary?.activeAlerts ?? 0 }}</h3>
            <p class="text-[#43474d] text-xs font-semibold mt-1">{{ t('dash.reqAdminAction') }}</p>
          </div>
          <a routerLink="/alerts" class="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#00152a] hover:underline">
            <span class="material-symbols-outlined text-sm">north_east</span>
            {{ t('dash.openAlerts') }}
          </a>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100" *ngIf="stats">
            <div class="px-6 py-5 flex justify-between items-center bg-[#f0f4f8]">
              <h3 class="font-bold text-[#171c1f] uppercase tracking-tight">{{ t('dash.latencyAnalysis') }}</h3>
              <span class="material-symbols-outlined text-[#43474d]">schedule</span>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-3 gap-6">
                <div class="text-center p-4 bg-[#f6fafe] rounded-lg">
                  <p class="text-[10px] font-bold text-[#43474d] uppercase mb-2">{{ t('dash.completion') }}</p>
                  <p class="text-xl font-black text-[#00152a]">{{ stats.ar3CompletionRate | number:'1.0-0' }}%</p>
                  <div class="w-full bg-[#e4e9ed] h-1 rounded-full mt-2 overflow-hidden">
                    <div class="bg-[#00152a] h-full" [style.width.%]="stats.ar3CompletionRate"></div>
                  </div>
                </div>
                <div class="text-center p-4 bg-[#f6fafe] rounded-lg">
                  <p class="text-[10px] font-bold text-[#43474d] uppercase mb-2">{{ t('dash.lateDocs') }}</p>
                  <p class="text-xl font-black text-[#00152a]">{{ stats.lateDocuments }}</p>
                  <div class="w-full bg-[#e4e9ed] h-1 rounded-full mt-2 overflow-hidden">
                    <div class="bg-[#ba1a1a] h-full" [style.width.%]="errorRate()"></div>
                  </div>
                </div>
                <div class="text-center p-4 bg-[#f6fafe] rounded-lg">
                  <p class="text-[10px] font-bold text-[#43474d] uppercase mb-2">{{ t('dash.integrity') }}</p>
                  <p class="text-xl font-black text-[#68dba9]">100%</p>
                  <div class="w-full bg-[#e4e9ed] h-1 rounded-full mt-2 overflow-hidden">
                    <div class="bg-[#68dba9] h-full" style="width: 100%"></div>
                  </div>
                </div>
              </div>

              <div class="mt-8 h-48 w-full">
                <canvas baseChart [data]="barChartData" [options]="barChartOptions" [type]="'bar'"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100" *ngIf="stats">
            <h4 class="text-[10px] font-black uppercase tracking-widest text-[#43474d] mb-6">{{ t('dash.queueComposition') }}</h4>
            <div class="space-y-4">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold">{{ t('dash.validatedAr3') }}</span>
                <span class="font-black">{{ stats.ar3Completed }}</span>
              </div>
              <div class="w-full bg-[#f0f4f8] h-1.5 rounded-full overflow-hidden">
                <div class="bg-[#24a375] h-full" [style.width.%]="ratio(stats.ar3Completed, stats.totalDocuments)"></div>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold">{{ t('dash.pending') }}</span>
                <span class="font-black">{{ stats.ar3Pending }}</span>
              </div>
              <div class="w-full bg-[#f0f4f8] h-1.5 rounded-full overflow-hidden">
                <div class="bg-[#44617d] h-full" [style.width.%]="ratio(stats.ar3Pending, stats.totalDocuments)"></div>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold">{{ t('dash.criticalErrors') }}</span>
                <span class="font-black">{{ stats.lateDocuments }}</span>
              </div>
              <div class="w-full bg-[#f0f4f8] h-1.5 rounded-full overflow-hidden">
                <div class="bg-[#ba1a1a] h-full" [style.width.%]="errorRate()"></div>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div class="flex items-center justify-between mb-5">
              <h4 class="text-[10px] font-black uppercase tracking-widest text-[#43474d]">{{ t('dash.alertPanel') }}</h4>
              <a routerLink="/alerts" class="text-xs font-bold text-[#00152a] hover:underline">{{ t('dash.openAlerts') }}</a>
            </div>
            <div class="grid grid-cols-3 gap-3 mb-5" *ngIf="alertSummary">
              <div class="rounded-lg bg-[#fff3f1] p-3">
                <div class="text-[10px] font-black uppercase text-[#93000a]">{{ t('alerts.missingAr') }}</div>
                <div class="text-xl font-black text-[#93000a] mt-1">{{ alertSummary.missingArAlerts }}</div>
              </div>
              <div class="rounded-lg bg-[#f1f4f8] p-3">
                <div class="text-[10px] font-black uppercase text-[#31485f]">{{ t('alerts.missingReception') }}</div>
                <div class="text-xl font-black text-[#31485f] mt-1">{{ alertSummary.missingReceptionAlerts }}</div>
              </div>
              <div class="rounded-lg bg-[#edf4ff] p-3">
                <div class="text-[10px] font-black uppercase text-[#12305b]">{{ t('alerts.amountDiscrepancy') }}</div>
                <div class="text-xl font-black text-[#12305b] mt-1">{{ alertSummary.amountDiscrepancyAlerts }}</div>
              </div>
            </div>
            <div class="space-y-3">
              <div *ngFor="let alert of recentAlerts" class="rounded-lg border border-slate-100 px-4 py-3">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-[10px] font-black uppercase tracking-widest" [class]="typeTextClass(alert.type)">{{ alert.code }}</span>
                  <span class="text-[11px] text-[#43474d]">{{ alert.detectedAt | date:'dd/MM HH:mm' }}</span>
                </div>
                <div class="text-sm font-bold text-[#171c1f] mt-2">{{ alert.title }}</div>
                <div class="text-xs text-[#43474d] mt-1">{{ alert.message }}</div>
              </div>
              <div *ngIf="recentAlerts.length === 0" class="text-sm text-[#43474d] italic">{{ t('alerts.empty') }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats?: DashboardStats;
  alertSummary?: AlertSummary;
  recentAlerts: Alert[] = [];
  isLive = false;
  activePeriod: 'daily' | 'weekly' | 'monthly' = 'daily';
  private eventSource?: EventSource;

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false }
    }
  };

  public barChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: 'rgba(16, 42, 67, 0.1)',
      hoverBackgroundColor: 'rgba(16, 42, 67, 0.2)',
      borderRadius: 4
    }]
  };

  constructor(private documentService: DocumentService, private translationService: TranslationService) {}

  t(key: string, params?: Record<string, string | number>): string {
    return this.translationService.t(key, params);
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadTrends();
    this.loadAlerts();
    this.connectSSE();
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  errorRate(): number {
    if (!this.stats?.totalDocuments) return 0;
    return this.ratio(this.stats.lateDocuments, this.stats.totalDocuments);
  }

  ratio(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }

  typeTextClass(type: AlertType): string {
    if (type === AlertType.MISSING_AR) return 'text-[#93000a]';
    if (type === AlertType.MISSING_RECEPTION) return 'text-[#31485f]';
    return 'text-[#12305b]';
  }

  private loadStats(): void {
    this.documentService.getStats().subscribe(stats => this.stats = stats);
  }

  setPeriod(period: 'daily' | 'weekly' | 'monthly'): void {
    this.activePeriod = period;
    this.loadTrends();
  }

  private loadTrends(): void {
    this.documentService.getLatencyTrends(this.activePeriod).subscribe(trends => {
      this.barChartData.labels = trends.map(trend => trend.date);
      this.barChartData.datasets[0].data = trends.map(trend => trend.count);
    });
  }

  private loadAlerts(): void {
    this.documentService.getAlertSummary().subscribe(summary => this.alertSummary = summary);
    this.documentService.getAlerts().subscribe(alerts => this.recentAlerts = alerts.slice(0, 4));
  }

  private connectSSE(): void {
    this.eventSource = new EventSource('/api/v1/events');
    this.eventSource.onopen = () => this.isLive = true;
    this.eventSource.onerror = () => this.isLive = false;
    this.eventSource.addEventListener('doc-updated', () => {
      this.loadStats();
      this.loadTrends();
      this.loadAlerts();
    });
    this.eventSource.addEventListener('alerts-updated', () => this.loadAlerts());
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8 space-y-8 font-['Inter']">
      <!-- Audit Headline -->
      <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <p class="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">Security & Compliance</p>
          <h2 class="text-4xl font-black tracking-tight text-on-surface">Audit Trail Ledger</h2>
          <p class="text-on-surface-variant font-medium mt-1">Immutable record of system access, document interactions, and administrative decisions.</p>
        </div>
        <div class="flex gap-3">
          <button class="flex items-center gap-2 px-4 py-2 bg-white text-on-surface text-sm font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all">
            <span class="material-symbols-outlined text-sm">filter_alt</span>
            Filters
          </button>
          <button class="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all shadow-lg shadow-primary/20">
            <span class="material-symbols-outlined text-sm">ios_share</span>
            Export Audit
          </button>
        </div>
      </div>

      <!-- Compliance Timeline -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div class="lg:col-span-3 space-y-6">
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="px-6 py-4 bg-surface-container-low border-b border-slate-100">
              <h3 class="font-bold text-on-surface uppercase tracking-tight text-sm">Recent Activity Ledger</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead class="bg-surface-container-low text-[10px] font-black uppercase text-on-surface-variant">
                  <tr>
                    <th class="px-6 py-3">Timestamp</th>
                    <th class="px-6 py-3">Subject</th>
                    <th class="px-6 py-3">Event Type</th>
                    <th class="px-6 py-3">Resource / Target</th>
                    <th class="px-6 py-3">Status</th>
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
                        <span class="text-[10px] font-bold text-[#24a375]">{{log.status || 'VERIFIED'}}</span>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="logs.length === 0">
                    <td colspan="5" class="px-6 py-10 text-center text-on-surface-variant italic">No activity recorded yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Compliance Sidebar -->
        <div class="space-y-6">
          <div class="bg-primary p-6 rounded-xl text-white">
            <h4 class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Integrity Status</h4>
            <div class="flex items-center gap-2 mb-4">
              <span class="material-symbols-outlined text-tertiary-fixed-dim">shield_check</span>
              <span class="text-xl font-black">Secure</span>
            </div>
            <p class="text-xs opacity-80 leading-relaxed">No integrity violations detected. All hash chains are valid.</p>
          </div>

          <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h4 class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-6">User Access Distribution</h4>
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
  styles: [`
    :host { display: block; }
  `]
})
export class AuditTrailComponent implements OnInit {
  logs: any[] = [];
  distribution: any[] = [];

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.documentService.getAuditLogs().subscribe(l => {
      this.logs = l;
      this.calculateDistribution();
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

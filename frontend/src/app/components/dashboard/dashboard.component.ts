import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { DocumentService } from '../../services/document.service';
import { DashboardStats } from '../../models/document.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="p-8 space-y-8 font-['Inter']">
      <!-- Dashboard Headline -->
      <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 class="text-3xl font-extrabold tracking-tight text-[#171c1f]">Compliance Overview</h2>
          <p class="text-[#43474d] font-medium mt-1">Real-time regulatory status for Fiscal Year 2024</p>
        </div>
        <div class="flex gap-2 bg-[#f0f4f8] p-1 rounded-lg">
          <button class="px-4 py-1.5 text-xs font-bold bg-white shadow-sm rounded">Daily</button>
          <button class="px-4 py-1.5 text-xs font-semibold text-[#43474d] hover:text-[#171c1f]">Weekly</button>
          <button class="px-4 py-1.5 text-xs font-semibold text-[#43474d] hover:text-[#171c1f]">Monthly</button>
        </div>
      </div>

      <!-- Bento Grid Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6" *ngIf="stats">
        <!-- Hero Metric: AR-3 Completion -->
        <div class="md:col-span-2 bg-white p-6 rounded-xl relative overflow-hidden group shadow-sm border border-slate-100">
          <div class="relative z-10">
            <div class="flex justify-between items-start mb-4">
              <span class="text-[10px] uppercase tracking-widest font-bold text-[#005137] bg-[#68dba9] px-2 py-0.5 rounded-sm">Performance Anchor</span>
              <span class="material-symbols-outlined text-[#68dba9]">verified_user</span>
            </div>
            <h3 class="text-4xl font-black text-[#00152a]">{{stats.ar3CompletionRate | number:'1.1-1'}}%</h3>
            <p class="text-[#43474d] text-sm font-semibold mt-1">AR-3 Completion Rate</p>
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

        <!-- Metric: Error Rate -->
        <div class="bg-white p-6 rounded-xl flex flex-col justify-between shadow-sm border border-slate-100">
          <div>
            <p class="text-[10px] uppercase tracking-widest font-bold text-[#43474d] mb-4">Error Rate</p>
            <h3 class="text-3xl font-black text-[#ba1a1a]">{{ (stats.lateDocuments / stats.totalDocuments * 100) | number:'1.2-2' }}%</h3>
            <p class="text-[#93000a] text-xs font-semibold mt-1 bg-[#ffdad6] inline-block px-1.5 py-0.5 rounded-sm">
              SLA Violations
            </p>
          </div>
          <div class="pt-4 mt-4 border-t border-[#e4e9ed]">
            <div class="flex justify-between text-[10px] font-bold text-[#43474d]">
              <span>LIMIT: 0.50%</span>
              <span [class.text-[#24a375]]="stats.lateDocuments / stats.totalDocuments < 0.005" [class.text-error]="stats.lateDocuments / stats.totalDocuments >= 0.005">
                {{ stats.lateDocuments / stats.totalDocuments < 0.005 ? 'HEALTHY' : 'CRITICAL' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Metric: Critical Alerts -->
        <div class="bg-white p-6 rounded-xl flex flex-col justify-between border-b-2 border-[#00152a] shadow-sm border border-slate-100">
          <div>
            <p class="text-[10px] uppercase tracking-widest font-bold text-[#43474d] mb-4">Active Blockages</p>
            <h3 class="text-3xl font-black text-[#00152a]">{{stats.lateDocuments | number:'2.0-0'}}</h3>
            <p class="text-[#43474d] text-xs font-semibold mt-1">Requiring Administrator Action</p>
          </div>
          <div class="flex -space-x-2 mt-4">
            <div class="h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[8px] font-bold">JD</div>
            <div class="h-6 w-6 rounded-full ring-2 ring-white bg-slate-300 flex items-center justify-center text-[8px] font-bold">AS</div>
            <div class="h-6 w-6 rounded-full ring-2 ring-white bg-slate-400 flex items-center justify-center text-[8px] font-bold">+1</div>
          </div>
        </div>
      </div>

      <!-- Main Workspace Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <!-- Delay Tracking Section -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100" *ngIf="stats">
            <div class="px-6 py-5 flex justify-between items-center bg-[#f0f4f8]">
              <h3 class="font-bold text-[#171c1f] uppercase tracking-tight">Temporal Latency Analysis</h3>
              <span class="material-symbols-outlined text-[#43474d]">schedule</span>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-3 gap-6">
                <div class="text-center p-4 bg-[#f6fafe] rounded-lg">
                  <p class="text-[10px] font-bold text-[#43474d] uppercase mb-2">Completion</p>
                  <p class="text-xl font-black text-[#00152a]">{{stats.ar3CompletionRate | number:'1.0-0'}}%</p>
                  <div class="w-full bg-[#e4e9ed] h-1 rounded-full mt-2 overflow-hidden">
                    <div class="bg-[#00152a] h-full" [style.width.%]="stats.ar3CompletionRate"></div>
                  </div>
                </div>
                <div class="text-center p-4 bg-[#f6fafe] rounded-lg">
                  <p class="text-[10px] font-bold text-[#43474d] uppercase mb-2">Late Docs</p>
                  <p class="text-xl font-black text-[#00152a]">{{stats.lateDocuments}}</p>
                  <div class="w-full bg-[#e4e9ed] h-1 rounded-full mt-2 overflow-hidden">
                    <div class="bg-[#ba1a1a] h-full" [style.width.%]="(stats.lateDocuments / stats.totalDocuments * 100)"></div>
                  </div>
                </div>
                <div class="text-center p-4 bg-[#f6fafe] rounded-lg">
                  <p class="text-[10px] font-bold text-[#43474d] uppercase mb-2">Integrity</p>
                  <p class="text-xl font-black text-[#68dba9]">100%</p>
                  <div class="w-full bg-[#e4e9ed] h-1 rounded-full mt-2 overflow-hidden">
                    <div class="bg-[#68dba9] h-full" style="width: 100%"></div>
                  </div>
                </div>
              </div>

              <!-- Trend Graph using Chart.js -->
              <div class="mt-8 h-48 w-full">
                <canvas baseChart
                  [data]="barChartData"
                  [options]="barChartOptions"
                  [type]="'bar'">
                </canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Side Panel Widgets -->
        <div class="space-y-6">
          <!-- Efficiency Card -->
          <div class="bg-[#00152a] p-6 rounded-xl text-white">
            <h4 class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Global Efficiency</h4>
            <p class="text-3xl font-black mb-4">91.4%</p>
            <p class="text-xs opacity-80 leading-relaxed mb-6">Your supervision unit is performing 12% above the industry benchmark for regulatory document processing.</p>
            <button class="w-full py-3 bg-white/10 hover:bg-white/20 transition-all rounded-lg font-bold text-xs uppercase tracking-widest">Generate Report</button>
          </div>

          <!-- Workflow Radar -->
          <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100" *ngIf="stats">
            <h4 class="text-[10px] font-black uppercase tracking-widest text-[#43474d] mb-6">Queue Composition</h4>
            <div class="space-y-4">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold">Validated (AR-3)</span>
                <span class="font-black">{{ stats.ar3Completed }}</span>
              </div>
              <div class="w-full bg-[#f0f4f8] h-1.5 rounded-full overflow-hidden">
                <div class="bg-[#24a375] h-full" [style.width.%]="(stats.ar3Completed / stats.totalDocuments * 100)"></div>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold">Pending</span>
                <span class="font-black">{{ stats.ar3Pending }}</span>
              </div>
              <div class="w-full bg-[#f0f4f8] h-1.5 rounded-full overflow-hidden">
                <div class="bg-[#44617d] h-full" [style.width.%]="(stats.ar3Pending / stats.totalDocuments * 100)"></div>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold">Critical Errors (Late)</span>
                <span class="font-black">{{ stats.lateDocuments }}</span>
              </div>
              <div class="w-full bg-[#f0f4f8] h-1.5 rounded-full overflow-hidden">
                <div class="bg-[#ba1a1a] h-full" [style.width.%]="(stats.lateDocuments / stats.totalDocuments * 100)"></div>
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
export class DashboardComponent implements OnInit {
  stats?: DashboardStats;

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
    labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    datasets: [{
      data: [40, 55, 45, 70, 65, 80, 95, 85, 90, 100],
      backgroundColor: 'rgba(16, 42, 67, 0.1)',
      hoverBackgroundColor: 'rgba(16, 42, 67, 0.2)',
      borderRadius: 4
    }]
  };

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.documentService.getStats().subscribe(s => {
      this.stats = s;
    });
  }
}

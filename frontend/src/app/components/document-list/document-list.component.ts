import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DocumentService } from '../../services/document.service';
import { DocumentDTO, DashboardStats } from '../../models/document.model';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="p-8 space-y-8 font-['Inter'] flex">
      <div class="flex-1 space-y-8">
        <!-- Catalog Headline -->
        <div class="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <p class="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">Central Vault > Catalog</p>
            <h2 class="text-4xl font-black tracking-tight text-on-surface">Document Catalog</h2>
            <p class="text-on-surface-variant font-medium mt-1">Advanced supervision interface for regulatory compliance documents and audit-ready ledger entries.</p>
          </div>
          <div class="flex gap-3">
            <button (click)="showFilters = !showFilters" [class.bg-primary]="showFilters" [class.text-white]="showFilters" class="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface-variant text-sm font-bold rounded-lg hover:bg-surface-container-high transition-all">
              <span class="material-symbols-outlined text-sm">filter_list</span>
              {{ showFilters ? 'Hide Filters' : 'Advance Filters' }}
            </button>
            <button class="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all shadow-lg shadow-primary/20">
              <span class="material-symbols-outlined text-sm">download</span>
              Export Ledger
            </button>
          </div>
        </div>

        <!-- Quick Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6" *ngIf="stats">
          <div class="bg-white p-6 rounded-xl border-l-4 border-primary shadow-sm flex justify-between items-center">
            <div>
              <p class="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Total Assets</p>
              <h3 class="text-2xl font-black text-primary">{{stats.totalDocuments | number}}</h3>
            </div>
            <div class="p-3 bg-primary/5 rounded-lg">
              <span class="material-symbols-outlined text-primary/40">inventory_2</span>
            </div>
          </div>
          <div class="bg-white p-6 rounded-xl border-l-4 border-[#24a375] shadow-sm flex justify-between items-center">
            <div>
              <p class="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Validated</p>
              <h3 class="text-2xl font-black text-[#24a375]">{{stats.ar3CompletionRate | number:'1.1-1'}}%</h3>
            </div>
            <div class="p-3 bg-[#24a375]/5 rounded-lg">
              <span class="material-symbols-outlined text-[#24a375]/40">verified_user</span>
            </div>
          </div>
          <div class="bg-white p-6 rounded-xl border-l-4 border-error shadow-sm flex justify-between items-center">
            <div>
              <p class="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Critical Errors</p>
              <h3 class="text-2xl font-black text-error">{{stats.lateDocuments}}</h3>
            </div>
            <div class="p-3 bg-error/5 rounded-lg">
              <span class="material-symbols-outlined text-error/40">warning</span>
            </div>
          </div>
          <div class="bg-white p-6 rounded-xl border-l-4 border-[#44617d] shadow-sm flex justify-between items-center">
            <div>
              <p class="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Pending AR-3</p>
              <h3 class="text-2xl font-black text-[#44617d]">{{stats.ar3Pending}}</h3>
            </div>
            <div class="p-3 bg-[#44617d]/5 rounded-lg">
              <span class="material-symbols-outlined text-[#44617d]/40">assignment_late</span>
            </div>
          </div>
        </div>

        <!-- Table Section -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="px-6 py-4 flex flex-wrap justify-between items-center bg-white border-b border-slate-100 gap-4">
            <div class="flex gap-6 items-center">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-on-surface-variant uppercase">Type:</span>
                <span class="text-xs font-bold text-primary">{{ filters.type || 'All' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-on-surface-variant uppercase">Status:</span>
                <span class="text-xs font-bold text-primary">{{ filters.status || 'All' }}</span>
              </div>
            </div>
            <p class="text-[11px] font-semibold text-on-surface-variant">Displaying <span class="font-bold text-primary">1-{{documents.length}}</span> of {{stats?.totalDocuments || documents.length}} records</p>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="bg-surface-container-low text-[10px] font-black uppercase text-on-surface-variant">
                <tr>
                  <th class="px-6 py-3 cursor-pointer">Document ID <span class="material-symbols-outlined text-[10px] align-middle">arrow_drop_down</span></th>
                  <th class="px-6 py-3 cursor-pointer">Type <span class="material-symbols-outlined text-[10px] align-middle">unfold_more</span></th>
                  <th class="px-6 py-3">Period</th>
                  <th class="px-6 py-3 cursor-pointer">Entity Code <span class="material-symbols-outlined text-[10px] align-middle">unfold_more</span></th>
                  <th class="px-6 py-3">Issuer</th>
                  <th class="px-6 py-3">Status</th>
                  <th class="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let doc of documents" class="zebra-stripe tonal-stack">
                  <td class="px-6 py-4 font-bold text-sm text-primary">{{doc.documentId}}</td>
                  <td class="px-6 py-4">
                    <span class="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tighter">{{doc.type}}</span>
                  </td>
                  <td class="px-6 py-4 text-xs font-medium text-on-surface-variant">{{doc.period}}</td>
                  <td class="px-6 py-4 text-xs font-medium text-on-surface-variant">{{doc.entityCode}}</td>
                  <td class="px-6 py-4 text-xs font-medium text-on-surface-variant">{{doc.issuerCode}}</td>
                  <td class="px-6 py-4">
                    <span *ngIf="doc.status === 'AR3'" class="bg-[#e7f6f1] text-[#24a375] px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tighter">VALIDATED</span>
                    <span *ngIf="doc.isLate && doc.status !== 'AR3'" class="bg-error-container text-on-error-container px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tighter">ERROR</span>
                    <span *ngIf="!doc.isLate && doc.status !== 'AR3'" class="bg-secondary-fixed text-on-secondary-fixed-variant px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tighter">AR3_PENDING</span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button class="p-1 hover:bg-slate-200/50 rounded-full transition-all text-on-surface-variant" [routerLink]="['/documents', doc.documentId]">
                      <span class="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Advanced Filter Panel -->
      <aside *ngIf="showFilters" class="w-80 bg-white border-l border-slate-200 p-6 space-y-6 shadow-xl animate-in slide-in-from-right duration-300">
        <div class="flex justify-between items-center border-b pb-4">
          <h3 class="font-black uppercase tracking-tight text-primary">Filters</h3>
          <button (click)="showFilters = false" class="text-on-surface-variant hover:text-primary">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-[10px] font-black uppercase text-on-surface-variant mb-1">Document Type</label>
            <select [(ngModel)]="filters.type" class="w-full bg-surface-container-low border-none rounded-lg text-sm p-2 focus:ring-2 focus:ring-primary/20">
              <option value="">All Types</option>
              <option value="VTIS">VTIS (Sales)</option>
              <option value="FTIS">FTIS (Invoices)</option>
              <option value="PTIS">PTIS (Payments)</option>
              <option value="REFERENTIEL">Master Data</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase text-on-surface-variant mb-1">Status</label>
            <select [(ngModel)]="filters.status" class="w-full bg-surface-container-low border-none rounded-lg text-sm p-2 focus:ring-2 focus:ring-primary/20">
              <option value="">All Statuses</option>
              <option value="AR0">Received (AR0)</option>
              <option value="AR2">Processed (AR2)</option>
              <option value="AR3">Validated (AR3)</option>
              <option value="AR4">Rejected (AR4)</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <input type="checkbox" [(ngModel)]="filters.lateOnly" id="lateOnly" class="rounded text-primary focus:ring-primary/20">
            <label for="lateOnly" class="text-xs font-bold text-on-surface-variant">Late Documents Only</label>
          </div>
        </div>

        <div class="pt-6 border-t space-y-3">
          <button (click)="applyFilters()" class="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all">
            Apply Filters
          </button>
          <button (click)="resetFilters()" class="w-full bg-surface-container-low text-on-surface-variant py-2.5 rounded-xl font-bold text-sm hover:bg-surface-container-high transition-all">
            Reset
          </button>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class DocumentListComponent implements OnInit {
  documents: DocumentDTO[] = [];
  stats?: DashboardStats;
  showFilters = false;

  filters = {
    type: '',
    status: '',
    lateOnly: false,
    limit: 15
  };

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.loadDocuments();
    this.documentService.getStats().subscribe(s => this.stats = s);
  }

  loadDocuments(): void {
    this.documentService.getDocuments('ENT_ALPHA', this.filters).subscribe(res => this.documents = res.items);
  }

  applyFilters(): void {
    this.loadDocuments();
  }

  resetFilters(): void {
    this.filters = { type: '', status: '', lateOnly: false, limit: 15 };
    this.loadDocuments();
  }
}

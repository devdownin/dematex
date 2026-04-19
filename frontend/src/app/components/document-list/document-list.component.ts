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
    <div class="p-8 space-y-8 font-['Inter']">
      <!-- Catalog Headline -->
      <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <p class="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">Central Vault > Catalog</p>
          <h2 class="text-4xl font-black tracking-tight text-on-surface">Document Catalog</h2>
          <p class="text-on-surface-variant font-medium mt-1">Advanced supervision interface for regulatory compliance documents and audit-ready ledger entries.</p>
        </div>
        <div class="flex gap-3">
          <button class="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface-variant text-sm font-bold rounded-lg hover:bg-surface-container-high transition-all">
            <span class="material-symbols-outlined text-sm">filter_list</span>
            Advance Filters
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
              <span class="text-xs font-bold text-primary">All Types</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold text-on-surface-variant uppercase">Period:</span>
              <span class="text-xs font-bold text-primary">2023 Q4</span>
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

        <div class="px-6 py-4 border-t border-slate-100 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-on-surface-variant">Rows per page:</span>
            <select class="bg-transparent border-none text-xs font-bold focus:ring-0">
              <option>15</option>
              <option>30</option>
              <option>50</option>
            </select>
          </div>
          <div class="flex items-center gap-4 text-on-surface-variant">
             <span class="material-symbols-outlined text-sm cursor-pointer opacity-40">first_page</span>
             <span class="material-symbols-outlined text-sm cursor-pointer opacity-40">chevron_left</span>
             <span class="text-xs font-bold"><span class="text-primary">1</span> of 1</span>
             <span class="material-symbols-outlined text-sm cursor-pointer hover:text-primary">chevron_right</span>
             <span class="material-symbols-outlined text-sm cursor-pointer hover:text-primary">last_page</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class DocumentListComponent implements OnInit {
  documents: DocumentDTO[] = [];
  stats?: DashboardStats;
  lateOnly = false;
  constructor(private documentService: DocumentService) {}
  ngOnInit(): void {
    this.loadDocuments();
    this.documentService.getStats().subscribe(s => this.stats = s);
  }
  loadDocuments(): void {
    this.documentService.getDocuments('ENT_ALPHA', { limit: 15, lateOnly: this.lateOnly }).subscribe(res => this.documents = res.items);
  }
}

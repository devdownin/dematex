import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { DocumentService } from '../../services/document.service';
import { ConfigService } from '../../services/config.service';
import { ClientType, DocumentDTO, DashboardStats } from '../../models/document.model';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ScrollingModule],
  template: `
    <div class="p-8 space-y-8 font-['Inter'] flex">
      <div class="flex-1 space-y-8 min-w-0">
        <!-- Catalog Headline -->
        <div class="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <p class="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">{{ t('docList.breadcrumb') }}</p>
            <h2 class="text-4xl font-black tracking-tight text-on-surface">{{ t('docList.title') }}</h2>
            <p class="text-on-surface-variant font-medium mt-1">{{ t('docList.subtitle') }}</p>
          </div>
          <div class="flex gap-3">
            <button (click)="showFilters = !showFilters" [class.bg-primary]="showFilters" [class.text-white]="showFilters" class="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface-variant text-sm font-bold rounded-lg hover:bg-surface-container-high transition-all">
              <span class="material-symbols-outlined text-sm">filter_list</span>
              {{ showFilters ? t('docList.hideFilters') : t('docList.advancedFilters') }}
            </button>
            <button (click)="exportDocuments()" class="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all shadow-lg shadow-primary/20">
              <span class="material-symbols-outlined text-sm">download</span>
              {{ t('docList.exportLedger') }}
            </button>
          </div>
        </div>

        <!-- Quick Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6" *ngIf="stats">
          <div class="bg-white p-6 rounded-xl border-l-4 border-primary shadow-sm flex justify-between items-center">
            <div>
              <p class="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">{{ t('docList.totalAssets') }}</p>
              <h3 class="text-2xl font-black text-primary">{{stats.totalDocuments | number}}</h3>
            </div>
            <div class="p-3 bg-primary/5 rounded-lg">
              <span class="material-symbols-outlined text-primary/40">inventory_2</span>
            </div>
          </div>
          <div class="bg-white p-6 rounded-xl border-l-4 border-[#24a375] shadow-sm flex justify-between items-center">
            <div>
              <p class="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">{{ t('docList.validated') }}</p>
              <h3 class="text-2xl font-black text-[#24a375]">{{stats.ar3CompletionRate | number:'1.1-1'}}%</h3>
            </div>
            <div class="p-3 bg-[#24a375]/5 rounded-lg">
              <span class="material-symbols-outlined text-[#24a375]/40">verified_user</span>
            </div>
          </div>
          <div class="bg-white p-6 rounded-xl border-l-4 border-error shadow-sm flex justify-between items-center">
            <div>
              <p class="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">{{ t('docList.criticalErrors') }}</p>
              <h3 class="text-2xl font-black text-error">{{stats.lateDocuments}}</h3>
            </div>
            <div class="p-3 bg-error/5 rounded-lg">
              <span class="material-symbols-outlined text-error/40">warning</span>
            </div>
          </div>
          <div class="bg-white p-6 rounded-xl border-l-4 border-[#44617d] shadow-sm flex justify-between items-center">
            <div>
              <p class="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">{{ t('docList.pendingAr3') }}</p>
              <h3 class="text-2xl font-black text-[#44617d]">{{stats.ar3Pending}}</h3>
            </div>
            <div class="p-3 bg-[#44617d]/5 rounded-lg">
              <span class="material-symbols-outlined text-[#44617d]/40">assignment_late</span>
            </div>
          </div>
        </div>

        <!-- Table Section -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
          <div class="px-6 py-4 flex flex-wrap justify-between items-center bg-white border-b border-slate-100 gap-4 flex-none">
            <div class="flex gap-6 items-center">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-on-surface-variant uppercase">{{ t('docList.type') }}:</span>
                <span class="text-xs font-bold text-primary">{{ filters.type || t('common.all') }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-on-surface-variant uppercase">{{ t('docList.status') }}:</span>
                <span class="text-xs font-bold text-primary">{{ filters.status || t('common.all') }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold text-on-surface-variant uppercase">{{ t('docList.clientType') }}:</span>
                <span class="text-xs font-bold text-primary">{{ filters.clientType || t('common.all') }}</span>
              </div>
              <div class="flex items-center gap-2" *ngIf="searchQuery">
                <span class="text-[10px] font-bold text-on-surface-variant uppercase">{{ t('docList.search') }}:</span>
                <span class="text-xs font-bold text-primary">{{ searchQuery }}</span>
              </div>
            </div>
            <p class="text-[11px] font-semibold text-on-surface-variant">
              {{ t('docList.displaying') }}
              <span class="font-bold text-primary">{{ documents.length === 0 ? 0 : 1 }}-{{ documents.length }}</span>
              {{ t('docList.of') }} {{ totalCount }} {{ t('docList.records') }}
            </p>
          </div>

          <!-- Header -->
          <div class="bg-surface-container-low text-[10px] font-black uppercase text-on-surface-variant flex-none grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1fr_1fr_80px] px-6 py-3 border-b">
            <div>{{ t('docList.colDocId') }}</div>
            <div>{{ t('docList.colType') }}</div>
            <div>{{ t('docList.colPeriod') }}</div>
            <div>{{ t('docList.colClientType') }}</div>
            <div>{{ t('docList.colEntityCode') }}</div>
            <div>{{ t('docList.colIssuer') }}</div>
            <div>{{ t('docList.colStatus') }}</div>
            <div class="text-right">{{ t('docList.colActions') }}</div>
          </div>

          <!-- Virtual Scroll Body -->
          <cdk-virtual-scroll-viewport itemSize="60" class="flex-1 scroll-container">
            <div *cdkVirtualFor="let doc of documents" class="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1fr_1fr_80px] px-6 py-4 items-center border-b border-slate-100 hover:bg-primary/5 transition-colors">
              <div class="font-bold text-sm text-primary truncate pr-4">{{doc.documentId}}</div>
              <div>
                <span class="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tighter">{{doc.type}}</span>
              </div>
              <div class="text-xs font-medium text-on-surface-variant">{{doc.period}}</div>
              <div class="text-xs font-medium text-on-surface-variant">{{doc.clientType}}</div>
              <div class="text-xs font-medium text-on-surface-variant">{{doc.entityCode}}</div>
              <div class="text-xs font-medium text-on-surface-variant">{{doc.issuerCode}}</div>
              <div>
                <span *ngIf="doc.status === 'AR3'" class="bg-[#e7f6f1] text-[#24a375] px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tighter">{{ t('common.validated') }}</span>
                <span *ngIf="doc.isLate && doc.status !== 'AR3'" class="bg-error-container text-on-error-container px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tighter">{{ t('common.error') }}</span>
                <span *ngIf="!doc.isLate && doc.status !== 'AR3'" class="bg-secondary-fixed text-on-secondary-fixed-variant px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tighter">{{ t('common.ar3Pending') }}</span>
              </div>
              <div class="text-right">
                <button class="p-1 hover:bg-slate-200/50 rounded-full transition-all text-on-surface-variant" [routerLink]="['/documents', doc.documentId]">
                  <span class="material-symbols-outlined">more_vert</span>
                </button>
              </div>
            </div>
          </cdk-virtual-scroll-viewport>
        </div>
      </div>

      <!-- Advanced Filter Panel -->
      <aside *ngIf="showFilters" class="w-80 bg-white border-l border-slate-200 p-6 space-y-6 shadow-xl animate-in slide-in-from-right duration-300">
        <div class="flex justify-between items-center border-b pb-4">
          <h3 class="font-black uppercase tracking-tight text-primary">{{ t('docList.filterTitle') }}</h3>
          <button (click)="showFilters = false" class="text-on-surface-variant hover:text-primary">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-[10px] font-black uppercase text-on-surface-variant mb-1">{{ t('docList.filterDocType') }}</label>
            <select [(ngModel)]="filters.type" class="w-full bg-surface-container-low border-none rounded-lg text-sm p-2 focus:ring-2 focus:ring-primary/20">
              <option value="">{{ t('docList.allTypes') }}</option>
              <option value="VTIS">VTIS ({{ t('docList.sales') }})</option>
              <option value="FTIS">FTIS ({{ t('docList.invoices') }})</option>
              <option value="PTIS">PTIS ({{ t('docList.payments') }})</option>
              <option value="CRMENS">{{ t('docList.masterData') }}</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase text-on-surface-variant mb-1">{{ t('docList.filterStatus') }}</label>
            <select [(ngModel)]="filters.status" class="w-full bg-surface-container-low border-none rounded-lg text-sm p-2 focus:ring-2 focus:ring-primary/20">
              <option value="">{{ t('docList.allStatuses') }}</option>
              <option value="AR0">{{ t('docList.received') }}</option>
              <option value="AR2">{{ t('docList.processed') }}</option>
              <option value="AR3">{{ t('docList.validatedAr3') }}</option>
              <option value="AR4">{{ t('docList.rejected') }}</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase text-on-surface-variant mb-1">{{ t('docList.filterClientType') }}</label>
            <select [(ngModel)]="filters.clientType" class="w-full bg-surface-container-low border-none rounded-lg text-sm p-2 focus:ring-2 focus:ring-primary/20">
              <option value="">{{ t('docList.allClientTypes') }}</option>
              <option [value]="ClientType.B2C">B2C</option>
              <option [value]="ClientType.B2BD">B2B France</option>
              <option [value]="ClientType.B2BI">B2B International</option>
              <option [value]="ClientType.B2G">B2G</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase text-on-surface-variant mb-1">{{ t('docList.filterPeriodStart') }}</label>
            <input [(ngModel)]="filters.periodStart" type="month" class="w-full bg-surface-container-low border-none rounded-lg text-sm p-2 focus:ring-2 focus:ring-primary/20">
          </div>

          <div>
            <label class="block text-[10px] font-black uppercase text-on-surface-variant mb-1">{{ t('docList.filterPeriodEnd') }}</label>
            <input [(ngModel)]="filters.periodEnd" type="month" class="w-full bg-surface-container-low border-none rounded-lg text-sm p-2 focus:ring-2 focus:ring-primary/20">
          </div>

          <div class="flex items-center gap-2">
            <input type="checkbox" [(ngModel)]="filters.lateOnly" id="lateOnly" class="rounded text-primary focus:ring-primary/20">
            <label for="lateOnly" class="text-xs font-bold text-on-surface-variant">{{ t('docList.lateOnly') }}</label>
          </div>
        </div>

        <div class="pt-6 border-t space-y-3">
          <button (click)="applyFilters()" class="w-full bg-primary text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all">
            {{ t('docList.applyFilters') }}
          </button>
          <button (click)="resetFilters()" class="w-full bg-surface-container-low text-on-surface-variant py-2.5 rounded-xl font-bold text-sm hover:bg-surface-container-high transition-all">
            {{ t('common.reset') }}
          </button>
        </div>
      </aside>
    </div>

    <div *ngIf="hasMore" class="px-8 pb-8">
      <button (click)="loadMore()" class="w-full md:w-auto px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-primary hover:bg-slate-50 transition-all">
        {{ t('docList.loadMore') }}
      </button>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class DocumentListComponent implements OnInit {
  readonly ClientType = ClientType;
  documents: DocumentDTO[] = [];
  stats?: DashboardStats;
  showFilters = false;
  hasMore = false;
  nextCursor: string | null = null;
  totalCount = 0;
  searchQuery = '';

  filters = {
    type: '',
    status: '',
    clientType: '',
    periodStart: '',
    periodEnd: '',
    lateOnly: false,
    limit: 15
  };

  constructor(
    private documentService: DocumentService,
    private configService: ConfigService,
    private route: ActivatedRoute,
    private translationService: TranslationService
  ) {}

  t(key: string, params?: Record<string, string | number>): string {
    return this.translationService.t(key, params);
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.searchQuery = params.get('q')?.trim() || '';
      this.loadDocuments(true);
    });
    this.documentService.getStats().subscribe(s => this.stats = s);
  }

  loadDocuments(reset = false): void {
    const entityCode = this.configService.config()?.entityCode || 'ENT_ALPHA';
    const cursor = reset ? null : this.nextCursor;
    const request = this.searchQuery
      ? this.documentService.searchDocuments(this.searchQuery, { entityCode, cursor, ...this.filters })
      : this.documentService.getDocuments(entityCode, { ...this.filters, cursor, q: this.searchQuery || null });

    request.subscribe(res => {
      this.documents = reset ? res.items : [...this.documents, ...res.items];
      this.nextCursor = res.nextCursor;
      this.hasMore = res.hasMore;
      this.totalCount = res.totalCount;
    });
  }

  applyFilters(): void {
    this.loadDocuments(true);
  }

  resetFilters(): void {
    this.filters = { type: '', status: '', clientType: '', periodStart: '', periodEnd: '', lateOnly: false, limit: 15 };
    this.loadDocuments(true);
  }

  loadMore(): void {
    if (!this.hasMore) {
      return;
    }
    this.loadDocuments(false);
  }

  exportDocuments(): void {
    const entityCode = this.configService.config()?.entityCode || 'ENT_ALPHA';
    this.documentService.exportDocuments(entityCode, { ...this.filters, q: this.searchQuery || null }).subscribe(blob => {
      this.downloadBlob(blob, 'documents-export.csv');
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

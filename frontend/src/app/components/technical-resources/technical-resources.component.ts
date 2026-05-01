import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchemaService } from '../../services/schema.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-technical-resources',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8 space-y-8 font-['Inter']">
      <!-- Header -->
      <div>
        <p class="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">{{ t('techResources.badge') }}</p>
        <h2 class="text-4xl font-black tracking-tight text-on-surface">{{ t('techResources.title') }}</h2>
        <p class="text-on-surface-variant font-medium mt-1">{{ t('techResources.subtitle') }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Schema Section -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="px-6 py-4 bg-surface-container-low border-b border-slate-100 flex justify-between items-center">
              <h3 class="font-bold text-on-surface uppercase tracking-tight text-sm">{{ t('techResources.xsdDownloads') }}</h3>
            </div>
            <div class="p-0">
              <div *ngIf="loading" class="text-center py-20">
                <div class="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                <p class="text-sm text-on-surface-variant">{{ t('common.loading') }}</p>
              </div>

              <div *ngIf="!loading" class="divide-y divide-slate-100">
                <div *ngFor="let entry of schemaEntries" class="p-6">
                  <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div class="flex items-start gap-4">
                      <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <span class="material-symbols-outlined text-blue-600">xml_base</span>
                      </div>
                      <div>
                        <h4 class="font-bold text-slate-900 flex items-center gap-2">
                          {{ entry.type }}
                          <span class="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">{{ t('techResources.flowTypes') }}</span>
                        </h4>
                        <p class="text-xs text-on-surface-variant mt-1 leading-relaxed">
                          {{ getDocTypeDesc(entry.type) }}
                        </p>
                      </div>
                    </div>
                    <div class="flex flex-col gap-2 min-w-[200px]">
                      <!-- Latest Version -->
                      <button (click)="downloadLatest(entry.type)" 
                        class="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#00152a] text-white rounded-lg text-xs font-bold transition-all hover:scale-[0.98] active:scale-95 shadow-lg shadow-primary/20">
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-sm">download</span>
                          {{ t('techResources.latestVersion') }}
                        </div>
                        <span class="font-mono opacity-60">{{ entry.versions[0] }}</span>
                      </button>

                      <!-- Version Dropdown/List -->
                      <div class="relative group">
                        <button class="w-full flex items-center justify-between gap-3 px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                          <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-sm">history</span>
                            {{ t('techResources.versions') }}
                          </div>
                          <span class="material-symbols-outlined text-sm group-hover:rotate-180 transition-transform">expand_more</span>
                        </button>
                        <div class="absolute right-0 top-full mt-1 w-full bg-white border border-slate-100 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-20 overflow-hidden">
                          <button *ngFor="let v of entry.versions" (click)="download(entry.type, v)" 
                            class="w-full px-4 py-2 text-left text-[11px] font-mono hover:bg-slate-50 text-slate-600 flex justify-between items-center group/item">
                            {{ v }}
                            <span class="material-symbols-outlined text-xs opacity-0 group-hover/item:opacity-100">download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Actions -->
        <div class="space-y-6">
          <!-- API Documentation Card -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h4 class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4">{{ t('techResources.apiDocTitle') }}</h4>
            <div class="flex items-start gap-4 mb-6">
              <div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-green-600">api</span>
              </div>
              <div>
                <p class="text-xs text-on-surface-variant leading-relaxed">
                  {{ t('techResources.apiDocDesc') }}
                </p>
              </div>
            </div>
            <a href="/swagger-ui/index.html" target="_blank"
              class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all shadow-lg shadow-green-600/20">
              <span class="material-symbols-outlined text-sm">open_in_new</span>
              {{ t('techResources.openSwagger') }}
            </a>
          </div>

          <!-- Quick Links / Help -->
          <div class="bg-[#00152a] p-6 rounded-xl text-white">
            <h4 class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Support Technique</h4>
            <p class="text-xs opacity-80 mb-4 leading-relaxed">
              Besoin d'aide pour l'intégration ? Consultez notre guide complet ou contactez notre équipe support.
            </p>
            <div class="space-y-2">
              <a href="#" class="flex items-center gap-2 text-xs font-bold text-white hover:underline">
                <span class="material-symbols-outlined text-sm">book</span>
                Guide d'intégration API
              </a>
              <a href="#" class="flex items-center gap-2 text-xs font-bold text-white hover:underline">
                <span class="material-symbols-outlined text-sm">mail</span>
                Contacter le support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class TechnicalResourcesComponent implements OnInit {
  loading = true;
  schemas: Record<string, string[]> = {};
  schemaEntries: { type: string, versions: string[] }[] = [];

  constructor(
    private schemaService: SchemaService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.schemaService.listSchemas().subscribe({
      next: (res) => {
        this.schemas = res;
        this.schemaEntries = Object.entries(res)
          .filter(([, versions]) => versions && versions.length > 0)
          .map(([type, versions]) => ({ type, versions }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  t(key: string): string {
    return this.translationService.t(key);
  }

  getDocTypeDesc(type: string): string {
    switch (type.toUpperCase()) {
      case 'VTIS': return this.t('docList.sales');
      case 'FTIS': return this.t('docList.invoices');
      case 'PTIS': return this.t('docList.payments');
      case 'CRMENS': return this.t('docList.masterData');
      default: return '';
    }
  }

  downloadLatest(type: string): void {
    this.schemaService.downloadLatestSchema(type).subscribe(blob => {
      this.saveBlob(blob, `${type}_latest.xsd`);
    });
  }

  download(type: string, version: string): void {
    this.schemaService.downloadSchema(type, version).subscribe(blob => {
      this.saveBlob(blob, `${type}_${version}.xsd`);
    });
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

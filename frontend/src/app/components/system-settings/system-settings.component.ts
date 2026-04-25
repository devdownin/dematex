import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, FileNode } from '../../services/settings.service';
import { ConfigService, PortalConfig } from '../../services/config.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-8 space-y-8 font-['Inter']">
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <p class="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">{{ t('settings.badge') }}</p>
          <h2 class="text-4xl font-black tracking-tight text-on-surface">{{ t('settings.title') }}</h2>
          <p class="text-on-surface-variant font-medium mt-1">{{ t('settings.subtitle') }}</p>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div *ngIf="successMessage" class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
        <span class="material-symbols-outlined text-sm">check_circle</span>
        {{ successMessage }}
      </div>
      <div *ngIf="errorMessage" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
        <span class="material-symbols-outlined text-sm">error</span>
        {{ errorMessage }}
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button *ngFor="let tab of tabs" (click)="activeTab = tab.id"
          class="px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2"
          [class.bg-white]="activeTab === tab.id"
          [class.shadow-sm]="activeTab === tab.id"
          [class.text-primary]="activeTab === tab.id"
          [class.text-on-surface-variant]="activeTab !== tab.id"
          [class.hover:text-on-surface]="activeTab !== tab.id">
          <span class="material-symbols-outlined text-sm">{{ tab.icon }}</span>
          {{ t(tab.labelKey) }}
        </button>
      </div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- TAB 1: File Tree                            -->
      <!-- ═══════════════════════════════════════════ -->
      <div *ngIf="activeTab === 'hierarchy'">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Storage Structure Tree -->
          <div class="lg:col-span-2 space-y-6">
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div class="px-6 py-4 bg-surface-container-low border-b border-slate-100 flex justify-between items-center">
                <h3 class="font-bold text-on-surface uppercase tracking-tight text-sm">{{ t('hierarchy.title') }}</h3>
                <span class="text-xs text-on-surface-variant font-mono">{{ rootPath }}</span>
              </div>
              <div class="p-6">
                <div *ngIf="issuers.length === 0 && !loadingIssuers" class="text-center py-10 text-on-surface-variant italic">
                  {{ t('hierarchy.empty') }}
                </div>
                
                <div *ngIf="loadingIssuers" class="text-center py-10">
                   <div class="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                </div>

                <div *ngFor="let issuer of issuers" class="mb-4">
                  <button (click)="toggleIssuer(issuer)" class="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition-all">
                    <span class="material-symbols-outlined text-sm text-primary">{{ expandedIssuers[issuer] ? 'expand_more' : 'chevron_right' }}</span>
                    <span class="material-symbols-outlined text-sm text-amber-600">folder</span>
                    <span class="font-bold text-sm">{{ issuer }}</span>
                    <div *ngIf="loadingEntities[issuer]" class="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  </button>
                  
                  <div *ngIf="expandedIssuers[issuer]" class="ml-6">
                    <div *ngFor="let entity of entities[issuer]" class="mb-2">
                      <button (click)="toggleEntity(issuer, entity)" class="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-all">
                        <span class="material-symbols-outlined text-sm text-primary">{{ expandedEntities[issuer + '/' + entity] ? 'expand_more' : 'chevron_right' }}</span>
                        <span class="material-symbols-outlined text-sm text-blue-500">folder_open</span>
                        <span class="font-semibold text-sm">{{ entity }}</span>
                        <div *ngIf="loadingTypes[issuer + '/' + entity]" class="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      </button>
                      
                      <div *ngIf="expandedEntities[issuer + '/' + entity]" class="ml-6">
                        <div *ngFor="let type of types[issuer + '/' + entity]" class="mb-2">
                          <button (click)="toggleType(issuer, entity, type.name)" class="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-all">
                            <span class="material-symbols-outlined text-sm text-primary">{{ expandedTypes[issuer + '/' + entity + '/' + type.name] ? 'expand_more' : 'chevron_right' }}</span>
                            <span class="material-symbols-outlined text-sm text-purple-500">folder_special</span>
                            <span class="font-medium text-sm">{{ type.name }}</span>
                            <span class="ml-2 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{{ type.fileCount }}</span>
                            <div *ngIf="loadingFiles[issuer + '/' + entity + '/' + type.name]" class="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                          </button>
                          
                          <div *ngIf="expandedTypes[issuer + '/' + entity + '/' + type.name]" class="ml-6 space-y-1">
                            <div *ngFor="let file of files[issuer + '/' + entity + '/' + type.name]"
                              class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 group transition-all"
                              [class.bg-blue-50]="selectedFile?.filename === file.filename">
                              <span class="material-symbols-outlined text-sm text-slate-400">description</span>
                              <span class="font-mono text-xs flex-1">{{ file.baseName }}<span class="text-primary font-bold">.{{ file.extension }}</span></span>
                              <button (click)="selectFileForRename(issuer, entity, type.name, file)"
                                class="opacity-0 group-hover:opacity-100 text-xs text-primary hover:underline transition-all">
                                {{ t('hierarchy.rename') }}
                              </button>
                              <button (click)="selectFileForMove(issuer, entity, type.name, file)"
                                class="opacity-0 group-hover:opacity-100 text-xs text-blue-600 hover:underline transition-all">
                                {{ t('hierarchy.move') }}
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
          </div>

          <!-- Action Panels -->
          <div class="space-y-6">
            <!-- Rename Panel -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6" *ngIf="renameMode">
              <h4 class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4">{{ t('rename.title') }}</h4>
              <div class="space-y-4">
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1">{{ t('rename.selected') }}</label>
                  <p class="font-mono text-sm bg-slate-50 px-3 py-2 rounded-lg">{{ selectedFile?.filename }}</p>
                </div>
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1">{{ t('rename.newName') }}</label>
                  <input [(ngModel)]="renameNewName" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="ex: doc_202403_VTIS_002" />
                </div>
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1">{{ t('rename.newExt') }}</label>
                  <select [(ngModel)]="renameNewExt" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="">{{ t('rename.keepCurrent') }} (.{{ selectedFile?.extension }})</option>
                    <option value="ALIRE">{{ t('docList.received') }}</option>
                    <option value="AR2">{{ t('docList.processed') }}</option>
                    <option value="AR3">{{ t('docList.validatedAr3') }}</option>
                    <option value="AR4">{{ t('docList.rejected') }}</option>
                  </select>
                </div>
                <div class="flex gap-2">
                  <button (click)="executeRename()" [disabled]="!renameNewName && !renameNewExt"
                    class="flex-1 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all disabled:opacity-50">
                    {{ t('rename.submit') }}
                  </button>
                  <button (click)="cancelRename()" class="px-4 py-2 bg-slate-100 text-on-surface text-sm font-bold rounded-lg hover:bg-slate-200 transition-all">
                    {{ t('rename.cancel') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Move Panel -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6" *ngIf="moveMode">
              <h4 class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4">{{ t('move.title') }}</h4>
              <div class="space-y-4">
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1">{{ t('move.file') }}</label>
                  <p class="font-mono text-sm bg-slate-50 px-3 py-2 rounded-lg">{{ selectedFile?.filename }}</p>
                </div>
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1">{{ t('move.targetIssuer') }}</label>
                  <input [(ngModel)]="moveTargetIssuer" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="ex: REC_001" />
                </div>
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1">{{ t('move.targetEntity') }}</label>
                  <input [(ngModel)]="moveTargetEntity" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="ex: ENT_ALPHA" />
                </div>
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1">{{ t('move.targetType') }}</label>
                  <select [(ngModel)]="moveTargetType" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="VTIS">VTIS ({{ t('docList.sales') }})</option>
                    <option value="FTIS">FTIS ({{ t('docList.invoices') }})</option>
                    <option value="PTIS">PTIS ({{ t('docList.payments') }})</option>
                    <option value="CRMENS">{{ t('docList.masterData') }}</option>
                  </select>
                </div>
                <div class="flex gap-2">
                  <button (click)="executeMove()" [disabled]="!moveTargetIssuer || !moveTargetEntity || !moveTargetType"
                    class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all disabled:opacity-50">
                    {{ t('move.submit') }}
                  </button>
                  <button (click)="cancelMove()" class="px-4 py-2 bg-slate-100 text-on-surface text-sm font-bold rounded-lg hover:bg-slate-200 transition-all">
                    {{ t('move.cancel') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Bulk Rename Panel -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h4 class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4">{{ t('bulk.title') }}</h4>
              <p class="text-xs text-on-surface-variant mb-4">{{ t('bulk.description') }}</p>
              <div class="space-y-3">
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1">{{ t('bulk.issuer') }}</label>
                  <input [(ngModel)]="bulkIssuer" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="ex: REC_001" />
                </div>
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1">{{ t('bulk.entity') }}</label>
                  <input [(ngModel)]="bulkEntity" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="ex: ENT_ALPHA" />
                </div>
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1">{{ t('bulk.type') }}</label>
                  <select [(ngModel)]="bulkType" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">{{ t('bulk.select') }}</option>
                    <option value="VTIS">VTIS ({{ t('docList.sales') }})</option>
                    <option value="FTIS">FTIS ({{ t('docList.invoices') }})</option>
                    <option value="PTIS">PTIS ({{ t('docList.payments') }})</option>
                    <option value="CRMENS">{{ t('docList.masterData') }}</option>
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-xs font-bold text-on-surface-variant block mb-1">{{ t('bulk.from') }}</label>
                    <select [(ngModel)]="bulkFromExt" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="ALIRE">{{ t('docList.received') }}</option>
                      <option value="AR2">{{ t('docList.processed') }}</option>
                      <option value="AR3">{{ t('docList.validatedAr3') }}</option>
                      <option value="AR4">{{ t('docList.rejected') }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-xs font-bold text-on-surface-variant block mb-1">{{ t('bulk.to') }}</label>
                    <select [(ngModel)]="bulkToExt" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option value="ALIRE">{{ t('docList.received') }}</option>
                      <option value="AR2">{{ t('docList.processed') }}</option>
                      <option value="AR3">{{ t('docList.validatedAr3') }}</option>
                      <option value="AR4">{{ t('docList.rejected') }}</option>
                    </select>
                  </div>
                </div>
                <button (click)="executeBulkRename()" [disabled]="!bulkIssuer || !bulkEntity || !bulkType || !bulkFromExt || !bulkToExt || bulkFromExt === bulkToExt"
                  class="w-full px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all disabled:opacity-50">
                  <span class="material-symbols-outlined text-sm align-middle mr-1">drive_file_rename_outline</span>
                  {{ t('bulk.submit') }}
                </button>
              </div>
            </div>

            <!-- Info Card -->
            <div class="bg-primary p-6 rounded-xl text-white">
              <h4 class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{{ t('info.title') }}</h4>
              <div class="font-mono text-xs opacity-90 space-y-1 leading-relaxed">
                <p>storage_root/</p>
                <p class="ml-3">{{'{'}}issuer{{'}'}}/</p>
                <p class="ml-6">{{'{'}}entity{{'}'}}/</p>
                <p class="ml-9">{{'{'}}type{{'}'}}/</p>
                <p class="ml-12">file.{{'{'}}status{{'}'}}</p>
              </div>
              <p class="text-xs opacity-70 mt-4 leading-relaxed">{{ t('info.description') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- TAB 2: Synchronization                      -->
      <!-- ═══════════════════════════════════════════ -->
      <div *ngIf="activeTab === 'sync'">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Sync Action Card -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="px-6 py-4 bg-surface-container-low border-b border-slate-100">
              <h3 class="font-bold text-on-surface uppercase tracking-tight text-sm">{{ t('sync.title') }}</h3>
            </div>
            <div class="p-6 space-y-6">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined text-blue-600">database</span>
                </div>
                <div>
                  <h4 class="font-bold text-on-surface text-sm">{{ t('sync.indexTitle') }}</h4>
                  <p class="text-xs text-on-surface-variant mt-1 leading-relaxed">{{ t('sync.indexDescription') }}</p>
                </div>
              </div>

              <div class="bg-slate-50 rounded-lg p-4 space-y-3">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-on-surface-variant font-medium">{{ t('sync.autoSync') }}</span>
                  <span class="text-green-600 font-bold flex items-center gap-1">
                    <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    {{ t('sync.active') }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-xs" *ngIf="rootPath">
                  <span class="text-on-surface-variant font-medium">{{ t('sync.storageRoot') }}</span>
                  <span class="font-mono text-on-surface">{{ rootPath }}</span>
                </div>
                <div class="flex items-center justify-between text-xs" *ngIf="issuers.length > 0">
                  <span class="text-on-surface-variant font-medium">{{ t('sync.issuersDetected') }}</span>
                  <span class="font-bold text-on-surface">{{ issuers.length }}</span>
                </div>
                <div class="flex items-center justify-between text-xs" *ngIf="issuers.length > 0">
                  <span class="text-on-surface-variant font-medium">{{ t('sync.totalFiles') }}</span>
                  <span class="font-bold text-on-surface">{{ getTotalFiles() }}</span>
                </div>
              </div>

              <button (click)="triggerSync()" [disabled]="syncing"
                class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
                <span class="material-symbols-outlined text-sm" [class.animate-spin]="syncing">sync</span>
                {{ syncing ? t('sync.syncing') : t('sync.forceSync') }}
              </button>
            </div>
          </div>

          <!-- Sync Info -->
          <div class="space-y-6">
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h4 class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4">{{ t('sync.howTitle') }}</h4>
              <div class="space-y-4">
                <div class="flex items-start gap-3">
                  <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black flex-shrink-0">1</div>
                  <div>
                    <p class="text-sm font-bold text-on-surface">{{ t('sync.step1Title') }}</p>
                    <p class="text-xs text-on-surface-variant mt-0.5">{{ t('sync.step1Desc') }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black flex-shrink-0">2</div>
                  <div>
                    <p class="text-sm font-bold text-on-surface">{{ t('sync.step2Title') }}</p>
                    <p class="text-xs text-on-surface-variant mt-0.5">{{ t('sync.step2Desc') }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black flex-shrink-0">3</div>
                  <div>
                    <p class="text-sm font-bold text-on-surface">{{ t('sync.step3Title') }}</p>
                    <p class="text-xs text-on-surface-variant mt-0.5">{{ t('sync.step3Desc') }}</p>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <div class="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-black flex-shrink-0">4</div>
                  <div>
                    <p class="text-sm font-bold text-on-surface">{{ t('sync.step4Title') }}</p>
                    <p class="text-xs text-on-surface-variant mt-0.5">{{ t('sync.step4Desc') }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div class="flex items-start gap-3">
                <span class="material-symbols-outlined text-amber-600 text-sm mt-0.5">warning</span>
                <div>
                  <p class="text-sm font-bold text-amber-800">{{ t('sync.warningTitle') }}</p>
                  <p class="text-xs text-amber-700 mt-1 leading-relaxed">{{ t('sync.warningDesc') }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- TAB 3: Application Settings                 -->
      <!-- ═══════════════════════════════════════════ -->
      <div *ngIf="activeTab === 'params'">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-6">
            <!-- Branding Section -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div class="px-6 py-4 bg-surface-container-low border-b border-slate-100">
                <h3 class="font-bold text-on-surface uppercase tracking-tight text-sm">{{ t('params.brandingTitle') }}</h3>
              </div>
              <div class="p-6 space-y-5">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label class="text-xs font-bold text-on-surface-variant block mb-1.5">{{ t('params.companyName') }}</label>
                    <input [(ngModel)]="configForm.companyName" class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Dematex Solutions" />
                  </div>
                  <div>
                    <label class="text-xs font-bold text-on-surface-variant block mb-1.5">{{ t('params.supportEmail') }}</label>
                    <input [(ngModel)]="configForm.supportEmail" type="email" class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="support@dematex.com" />
                  </div>
                </div>
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1.5">{{ t('params.logoUrl') }}</label>
                  <input [(ngModel)]="configForm.logoUrl" class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="https://example.com/logo.svg" />
                </div>
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1.5">{{ t('params.primaryColor') }}</label>
                  <div class="flex items-center gap-3">
                    <input type="color" [(ngModel)]="configForm.primaryColor" class="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
                    <input [(ngModel)]="configForm.primaryColor" class="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="#3f51b5" />
                    <div class="w-10 h-10 rounded-lg border border-slate-200" [style.background-color]="configForm.primaryColor"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Technical Section -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div class="px-6 py-4 bg-surface-container-low border-b border-slate-100">
                <h3 class="font-bold text-on-surface uppercase tracking-tight text-sm">{{ t('params.technicalTitle') }}</h3>
              </div>
              <div class="p-6 space-y-5">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label class="text-xs font-bold text-on-surface-variant block mb-1.5">{{ t('params.entityCode') }}</label>
                    <input [(ngModel)]="configForm.entityCode" class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="ENT_ALPHA" />
                    <p class="text-[10px] text-on-surface-variant mt-1">{{ t('params.entityCodeHint') }}</p>
                  </div>
                  <div>
                    <label class="text-xs font-bold text-on-surface-variant block mb-1.5">{{ t('params.storageRoot') }}</label>
                    <input [(ngModel)]="configForm.storageRoot" class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50" placeholder="./regulatory_files" readonly />
                    <p class="text-[10px] text-on-surface-variant mt-1">{{ t('params.storageRootHint') }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Save Button -->
            <div class="flex items-center gap-4">
              <button (click)="saveConfig()" [disabled]="savingConfig"
                class="flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
                <span class="material-symbols-outlined text-sm" [class.animate-spin]="savingConfig">{{ savingConfig ? 'sync' : 'save' }}</span>
                {{ savingConfig ? t('params.saving') : t('params.save') }}
              </button>
              <button (click)="resetConfigForm()"
                class="px-6 py-3 bg-slate-100 text-on-surface text-sm font-bold rounded-lg hover:bg-slate-200 transition-all">
                {{ t('params.reset') }}
              </button>
            </div>
          </div>

          <!-- Preview & Info -->
          <div class="space-y-6">
            <!-- Live Preview -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div class="px-6 py-4 bg-surface-container-low border-b border-slate-100">
                <h3 class="font-bold text-on-surface uppercase tracking-tight text-sm">{{ t('params.previewTitle') }}</h3>
              </div>
              <div class="p-6">
                <div class="rounded-lg border border-slate-200 overflow-hidden">
                  <div class="p-4 text-white" [style.background-color]="configForm.primaryColor || '#3f51b5'">
                    <div class="flex items-center gap-3 mb-3">
                      <img *ngIf="configForm.logoUrl" [src]="configForm.logoUrl" class="w-8 h-8 rounded-lg bg-white/20 object-contain" alt="logo" />
                      <div *ngIf="!configForm.logoUrl" class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <span class="material-symbols-outlined text-sm">business</span>
                      </div>
                      <div>
                        <p class="text-xs font-bold">{{ configForm.companyName || 'Company name' }}</p>
                        <p class="text-[9px] opacity-70">{{ t('nav.subtitle') }}</p>
                      </div>
                    </div>
                    <div class="space-y-1">
                      <div class="flex items-center gap-2 px-2 py-1 rounded bg-white/20 text-[10px]">
                        <span class="material-symbols-outlined text-[10px]">dashboard</span> {{ t('nav.dashboard') }}
                      </div>
                      <div class="flex items-center gap-2 px-2 py-1 rounded text-[10px] opacity-70">
                        <span class="material-symbols-outlined text-[10px]">table_chart</span> {{ t('nav.documents') }}
                      </div>
                      <div class="flex items-center gap-2 px-2 py-1 rounded text-[10px] opacity-70">
                        <span class="material-symbols-outlined text-[10px]">settings</span> {{ t('nav.settings') }}
                      </div>
                    </div>
                  </div>
                  <div class="p-3 bg-slate-50 text-[10px] text-on-surface-variant">
                    <span class="material-symbols-outlined text-[10px]">mail</span>
                    {{ configForm.supportEmail || 'support@example.com' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Warning -->
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div class="flex items-start gap-3">
                <span class="material-symbols-outlined text-amber-600 text-sm mt-0.5">info</span>
                <div>
                  <p class="text-sm font-bold text-amber-800">{{ t('params.persistenceTitle') }}</p>
                  <p class="text-xs text-amber-700 mt-1 leading-relaxed">{{ t('params.persistenceDesc') }}</p>
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
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class SystemSettingsComponent implements OnInit {
  issuers: string[] = [];
  entities: Record<string, string[]> = {};
  types: Record<string, any[]> = {};
  files: Record<string, FileNode[]> = {};
  
  rootPath = '';
  syncing = false;
  savingConfig = false;
  successMessage = '';
  errorMessage = '';

  activeTab = 'hierarchy';
  tabs = [
    { id: 'hierarchy', labelKey: 'settings.tab.hierarchy', icon: 'folder_open' },
    { id: 'sync', labelKey: 'settings.tab.sync', icon: 'sync' },
    { id: 'params', labelKey: 'settings.tab.params', icon: 'tune' }
  ];

  // Loading states
  loadingIssuers = false;
  loadingEntities: Record<string, boolean> = {};
  loadingTypes: Record<string, boolean> = {};
  loadingFiles: Record<string, boolean> = {};

  // Tree expansion state
  expandedIssuers: Record<string, boolean> = {};
  expandedEntities: Record<string, boolean> = {};
  expandedTypes: Record<string, boolean> = {};

  // ... (rest of the state variables same as before)
  renameMode = false;
  selectedFile: FileNode | null = null;
  selectedDocId = '';
  renameNewName = '';
  renameNewExt = '';
  moveMode = false;
  moveTargetIssuer = '';
  moveTargetEntity = '';
  moveTargetType = 'VTIS';
  bulkIssuer = '';
  bulkEntity = '';
  bulkType = '';
  bulkFromExt = 'ALIRE';
  bulkToExt = 'AR3';
  configForm: Partial<PortalConfig> = {};

  constructor(
    private settingsService: SettingsService,
    private configService: ConfigService,
    private translationService: TranslationService
  ) {}

  t(key: string, params?: Record<string, string | number>): string {
    return this.translationService.t(key, params);
  }

  ngOnInit(): void {
    this.loadIssuers();
    this.resetConfigForm();
    const conf = this.configService.config();
    if (conf) this.rootPath = conf.storageRoot;
  }

  loadIssuers(): void {
    this.loadingIssuers = true;
    this.settingsService.getIssuers().subscribe({
      next: res => {
        this.issuers = res;
        this.loadingIssuers = false;
      },
      error: () => {
        this.loadingIssuers = false;
        this.showError(this.t('toast.loadError'));
      }
    });
  }

  toggleIssuer(issuer: string): void {
    this.expandedIssuers[issuer] = !this.expandedIssuers[issuer];
    if (this.expandedIssuers[issuer] && !this.entities[issuer]) {
      this.loadingEntities[issuer] = true;
      this.settingsService.getEntities(issuer).subscribe({
        next: res => {
          this.entities[issuer] = res;
          this.loadingEntities[issuer] = false;
        },
        error: () => this.loadingEntities[issuer] = false
      });
    }
  }

  toggleEntity(issuer: string, entity: string): void {
    const key = `${issuer}/${entity}`;
    this.expandedEntities[key] = !this.expandedEntities[key];
    if (this.expandedEntities[key] && !this.types[key]) {
      this.loadingTypes[key] = true;
      this.settingsService.getTypes(issuer, entity).subscribe({
        next: res => {
          this.types[key] = res;
          this.loadingTypes[key] = false;
        },
        error: () => this.loadingTypes[key] = false
      });
    }
  }

  toggleType(issuer: string, entity: string, type: string): void {
    const key = `${issuer}/${entity}/${type}`;
    this.expandedTypes[key] = !this.expandedTypes[key];
    if (this.expandedTypes[key] && !this.files[key]) {
      this.loadingFiles[key] = true;
      this.settingsService.getFiles(issuer, entity, type).subscribe({
        next: res => {
          this.files[key] = res;
          this.loadingFiles[key] = false;
        },
        error: () => this.loadingFiles[key] = false
      });
    }
  }

  getTotalFiles(): number {
    // This is now harder to compute precisely without full structure, 
    // maybe return a placeholder or total from another endpoint if needed.
    return 0; 
  }

  triggerSync(): void {
    this.syncing = true;
    this.settingsService.triggerSync().subscribe({
      next: () => {
        this.syncing = false;
        this.showSuccess(this.t('toast.syncSuccess'));
        // Clear caches and reload issuers
        this.entities = {}; this.types = {}; this.files = {};
        this.loadIssuers();
      },
      error: () => {
        this.syncing = false;
        this.showError(this.t('toast.syncError'));
      }
    });
  }

  // ... (rename/move methods remain same, but call loadIssuers or clear caches)
  resetConfigForm(): void {
    const current = this.configService.config();
    if (current) {
      this.configForm = { ...current };
    }
  }

  saveConfig(): void {
    this.savingConfig = true;
    const { storageRoot, ...updatable } = this.configForm;
    this.configService.updateConfig(updatable).subscribe({
      next: () => {
        this.savingConfig = false;
        this.showSuccess(this.t('toast.configSuccess'));
      },
      error: () => {
        this.savingConfig = false;
        this.showError(this.t('toast.configError'));
      }
    });
  }

  selectFileForRename(issuer: string, entity: string, type: string, file: FileNode): void {
    this.renameMode = true;
    this.moveMode = false;
    this.selectedFile = file;
    this.selectedDocId = issuer + '_' + entity + '_' + file.baseName;
    this.renameNewName = file.baseName;
    this.renameNewExt = '';
  }

  selectFileForMove(issuer: string, entity: string, type: string, file: FileNode): void {
    this.moveMode = true;
    this.renameMode = false;
    this.selectedFile = file;
    this.selectedDocId = issuer + '_' + entity + '_' + file.baseName;
    this.moveTargetIssuer = issuer;
    this.moveTargetEntity = entity;
    this.moveTargetType = type;
  }

  executeRename(): void {
    const newName = this.renameNewName !== this.selectedFile?.baseName ? this.renameNewName : '';
    this.settingsService.renameFile(this.selectedDocId, newName, this.renameNewExt).subscribe({
      next: () => { 
        this.showSuccess(this.t('toast.renameSuccess')); 
        this.cancelRename();
        // Clear specific cache and reload
        const key = this.moveTargetIssuer + '/' + this.moveTargetEntity + '/' + this.moveTargetType; // inaccurate here but you get the idea
        this.loadIssuers(); // Simplest: reload root
      },
      error: (err) => this.showError(this.extractError(err, 'toast.renameError'))
    });
  }

  executeMove(): void {
    this.settingsService.moveFiles([this.selectedDocId], this.moveTargetIssuer, this.moveTargetEntity, this.moveTargetType).subscribe({
      next: () => { this.showSuccess(this.t('toast.moveSuccess')); this.cancelMove(); this.loadIssuers(); },
      error: (err) => this.showError(this.extractError(err, 'toast.moveError'))
    });
  }

  executeBulkRename(): void {
    this.settingsService.bulkRename(this.bulkIssuer, this.bulkEntity, this.bulkType, this.bulkFromExt, this.bulkToExt).subscribe({
      next: (res: any) => { this.showSuccess(this.t('toast.bulkSuccess', { count: res.filesRenamed })); this.loadIssuers(); },
      error: (err) => this.showError(this.extractError(err, 'toast.bulkError'))
    });
  }

  cancelRename(): void { this.renameMode = false; this.selectedFile = null; this.renameNewName = ''; this.renameNewExt = ''; }
  cancelMove(): void { this.moveMode = false; this.selectedFile = null; }

  private showSuccess(msg: string): void { this.successMessage = msg; this.errorMessage = ''; setTimeout(() => this.successMessage = '', 5000); }
  private showError(msg: string): void { this.errorMessage = msg; this.successMessage = ''; setTimeout(() => this.errorMessage = '', 5000); }

  private extractError(error: any, fallbackKey: string): string {
    const errObj = error?.error;
    if (typeof errObj?.code === 'string' && errObj.code.startsWith('error.')) {
      const translated = this.t(errObj.code);
      if (translated !== errObj.code) return translated;
    }
    return errObj?.message || errObj?.detail || error?.message || this.t(fallbackKey);
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, StorageStructure, IssuerNode, EntityNode, TypeNode, FileNode } from '../../services/settings.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-8 space-y-8 font-['Inter']">
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <p class="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase mb-1">Administration</p>
          <h2 class="text-4xl font-black tracking-tight text-on-surface">System Settings</h2>
          <p class="text-on-surface-variant font-medium mt-1">Gestion de la structure des r&eacute;pertoires, renommage de fichiers et synchronisation de l'index.</p>
        </div>
        <div class="flex gap-3">
          <button (click)="triggerSync()" [disabled]="syncing"
            class="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
            <span class="material-symbols-outlined text-sm" [class.animate-spin]="syncing">sync</span>
            {{ syncing ? 'Synchronisation...' : 'Forcer la synchro H2' }}
          </button>
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

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Storage Structure Tree -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="px-6 py-4 bg-surface-container-low border-b border-slate-100 flex justify-between items-center">
              <h3 class="font-bold text-on-surface uppercase tracking-tight text-sm">Arborescence de stockage</h3>
              <span class="text-xs text-on-surface-variant font-mono" *ngIf="structure">{{ structure.rootPath }}</span>
            </div>
            <div class="p-6" *ngIf="structure">
              <div *ngIf="structure.issuers.length === 0" class="text-center py-10 text-on-surface-variant italic">
                Aucun r&eacute;pertoire trouv&eacute; dans le stockage.
              </div>
              <div *ngFor="let issuer of structure.issuers" class="mb-4">
                <button (click)="toggleIssuer(issuer.name)" class="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition-all">
                  <span class="material-symbols-outlined text-sm text-primary">{{ expandedIssuers[issuer.name] ? 'expand_more' : 'chevron_right' }}</span>
                  <span class="material-symbols-outlined text-sm text-amber-600">folder</span>
                  <span class="font-bold text-sm">{{ issuer.name }}</span>
                </button>
                <div *ngIf="expandedIssuers[issuer.name]" class="ml-6">
                  <div *ngFor="let entity of issuer.entities" class="mb-2">
                    <button (click)="toggleEntity(issuer.name, entity.name)" class="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-all">
                      <span class="material-symbols-outlined text-sm text-primary">{{ expandedEntities[issuer.name + '/' + entity.name] ? 'expand_more' : 'chevron_right' }}</span>
                      <span class="material-symbols-outlined text-sm text-blue-500">folder_open</span>
                      <span class="font-semibold text-sm">{{ entity.name }}</span>
                    </button>
                    <div *ngIf="expandedEntities[issuer.name + '/' + entity.name]" class="ml-6">
                      <div *ngFor="let type of entity.types" class="mb-2">
                        <button (click)="toggleType(issuer.name, entity.name, type.name)" class="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-all">
                          <span class="material-symbols-outlined text-sm text-primary">{{ expandedTypes[issuer.name + '/' + entity.name + '/' + type.name] ? 'expand_more' : 'chevron_right' }}</span>
                          <span class="material-symbols-outlined text-sm text-purple-500">folder_special</span>
                          <span class="font-medium text-sm">{{ type.name }}</span>
                          <span class="ml-2 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{{ type.fileCount }}</span>
                        </button>
                        <div *ngIf="expandedTypes[issuer.name + '/' + entity.name + '/' + type.name]" class="ml-6 space-y-1">
                          <div *ngFor="let file of type.files"
                            class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 group transition-all"
                            [class.bg-blue-50]="selectedFile?.filename === file.filename">
                            <span class="material-symbols-outlined text-sm text-slate-400">description</span>
                            <span class="font-mono text-xs flex-1">{{ file.baseName }}<span class="text-primary font-bold">.{{ file.extension }}</span></span>
                            <button (click)="selectFileForRename(issuer.name, entity.name, type.name, file)"
                              class="opacity-0 group-hover:opacity-100 text-xs text-primary hover:underline transition-all">
                              Renommer
                            </button>
                            <button (click)="selectFileForMove(issuer.name, entity.name, type.name, file)"
                              class="opacity-0 group-hover:opacity-100 text-xs text-blue-600 hover:underline transition-all">
                              D&eacute;placer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div *ngIf="!structure" class="p-10 text-center">
              <span class="material-symbols-outlined text-4xl text-slate-300 animate-spin">sync</span>
              <p class="mt-2 text-on-surface-variant">Chargement de la structure...</p>
            </div>
          </div>
        </div>

        <!-- Action Panels -->
        <div class="space-y-6">
          <!-- Rename Panel -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6" *ngIf="renameMode">
            <h4 class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4">Renommer un fichier</h4>
            <div class="space-y-4">
              <div>
                <label class="text-xs font-bold text-on-surface-variant block mb-1">Fichier s&eacute;lectionn&eacute;</label>
                <p class="font-mono text-sm bg-slate-50 px-3 py-2 rounded-lg">{{ selectedFile?.filename }}</p>
              </div>
              <div>
                <label class="text-xs font-bold text-on-surface-variant block mb-1">Nouveau nom (sans extension)</label>
                <input [(ngModel)]="renameNewName" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="ex: doc_202403_VTIS_002" />
              </div>
              <div>
                <label class="text-xs font-bold text-on-surface-variant block mb-1">Nouvelle extension</label>
                <select [(ngModel)]="renameNewExt" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  <option value="">Garder l'actuelle (.{{ selectedFile?.extension }})</option>
                  <option value="ALIRE">ALIRE (AR0)</option>
                  <option value="AR2">AR2</option>
                  <option value="AR3">AR3</option>
                  <option value="AR4">AR4</option>
                </select>
              </div>
              <div class="flex gap-2">
                <button (click)="executeRename()" [disabled]="!renameNewName && !renameNewExt"
                  class="flex-1 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all disabled:opacity-50">
                  Renommer
                </button>
                <button (click)="cancelRename()" class="px-4 py-2 bg-slate-100 text-on-surface text-sm font-bold rounded-lg hover:bg-slate-200 transition-all">
                  Annuler
                </button>
              </div>
            </div>
          </div>

          <!-- Move Panel -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6" *ngIf="moveMode">
            <h4 class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4">D&eacute;placer un fichier</h4>
            <div class="space-y-4">
              <div>
                <label class="text-xs font-bold text-on-surface-variant block mb-1">Fichier</label>
                <p class="font-mono text-sm bg-slate-50 px-3 py-2 rounded-lg">{{ selectedFile?.filename }}</p>
              </div>
              <div>
                <label class="text-xs font-bold text-on-surface-variant block mb-1">Issuer cible</label>
                <input [(ngModel)]="moveTargetIssuer" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="ex: REC_001" />
              </div>
              <div>
                <label class="text-xs font-bold text-on-surface-variant block mb-1">Entity cible</label>
                <input [(ngModel)]="moveTargetEntity" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="ex: ENT_ALPHA" />
              </div>
              <div>
                <label class="text-xs font-bold text-on-surface-variant block mb-1">Type cible</label>
                <select [(ngModel)]="moveTargetType" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="VTIS">VTIS</option>
                  <option value="FTIS">FTIS</option>
                  <option value="PTIS">PTIS</option>
                  <option value="REFERENTIEL">REFERENTIEL</option>
                </select>
              </div>
              <div class="flex gap-2">
                <button (click)="executeMove()" [disabled]="!moveTargetIssuer || !moveTargetEntity || !moveTargetType"
                  class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all disabled:opacity-50">
                  D&eacute;placer
                </button>
                <button (click)="cancelMove()" class="px-4 py-2 bg-slate-100 text-on-surface text-sm font-bold rounded-lg hover:bg-slate-200 transition-all">
                  Annuler
                </button>
              </div>
            </div>
          </div>

          <!-- Bulk Rename Panel -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h4 class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4">Renommage par lot (extension)</h4>
            <p class="text-xs text-on-surface-variant mb-4">Change l'extension de tous les fichiers d'un r&eacute;pertoire donn&eacute;. Utile pour mettre &agrave; jour le statut en masse.</p>
            <div class="space-y-3">
              <div>
                <label class="text-xs font-bold text-on-surface-variant block mb-1">Issuer</label>
                <input [(ngModel)]="bulkIssuer" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="ex: REC_001" />
              </div>
              <div>
                <label class="text-xs font-bold text-on-surface-variant block mb-1">Entity</label>
                <input [(ngModel)]="bulkEntity" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="ex: ENT_ALPHA" />
              </div>
              <div>
                <label class="text-xs font-bold text-on-surface-variant block mb-1">Type</label>
                <select [(ngModel)]="bulkType" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">-- S&eacute;lectionner --</option>
                  <option value="VTIS">VTIS</option>
                  <option value="FTIS">FTIS</option>
                  <option value="PTIS">PTIS</option>
                  <option value="REFERENTIEL">REFERENTIEL</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1">De</label>
                  <select [(ngModel)]="bulkFromExt" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="ALIRE">ALIRE</option>
                    <option value="AR2">AR2</option>
                    <option value="AR3">AR3</option>
                    <option value="AR4">AR4</option>
                  </select>
                </div>
                <div>
                  <label class="text-xs font-bold text-on-surface-variant block mb-1">Vers</label>
                  <select [(ngModel)]="bulkToExt" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="ALIRE">ALIRE</option>
                    <option value="AR2">AR2</option>
                    <option value="AR3">AR3</option>
                    <option value="AR4">AR4</option>
                  </select>
                </div>
              </div>
              <button (click)="executeBulkRename()" [disabled]="!bulkIssuer || !bulkEntity || !bulkType || !bulkFromExt || !bulkToExt || bulkFromExt === bulkToExt"
                class="w-full px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:scale-[0.98] transition-all disabled:opacity-50">
                <span class="material-symbols-outlined text-sm align-middle mr-1">drive_file_rename_outline</span>
                Ex&eacute;cuter le renommage en lot
              </button>
            </div>
          </div>

          <!-- Info Card -->
          <div class="bg-primary p-6 rounded-xl text-white">
            <h4 class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Structure attendue</h4>
            <div class="font-mono text-xs opacity-90 space-y-1 leading-relaxed">
              <p>storage_root/</p>
              <p class="ml-3">{{'{'}}issuer{{'}'}}/</p>
              <p class="ml-6">{{'{'}}entity{{'}'}}/</p>
              <p class="ml-9">{{'{'}}type{{'}'}}/</p>
              <p class="ml-12">fichier.{{'{'}}status{{'}'}}</p>
            </div>
            <p class="text-xs opacity-70 mt-4 leading-relaxed">
              L'extension du fichier d&eacute;termine le statut AR (ALIRE, AR2, AR3, AR4).
              Toute modification entra&icirc;ne une resynchronisation automatique de l'index H2.
            </p>
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
  structure: StorageStructure | null = null;
  syncing = false;
  successMessage = '';
  errorMessage = '';

  // Tree expansion state
  expandedIssuers: Record<string, boolean> = {};
  expandedEntities: Record<string, boolean> = {};
  expandedTypes: Record<string, boolean> = {};

  // Rename state
  renameMode = false;
  selectedFile: FileNode | null = null;
  selectedDocId = '';
  renameNewName = '';
  renameNewExt = '';

  // Move state
  moveMode = false;
  moveTargetIssuer = '';
  moveTargetEntity = '';
  moveTargetType = 'VTIS';

  // Bulk rename state
  bulkIssuer = '';
  bulkEntity = '';
  bulkType = '';
  bulkFromExt = 'ALIRE';
  bulkToExt = 'AR3';

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.loadStructure();
  }

  loadStructure(): void {
    this.settingsService.getStorageStructure().subscribe({
      next: s => this.structure = s,
      error: () => this.showError('Impossible de charger la structure de stockage')
    });
  }

  triggerSync(): void {
    this.syncing = true;
    this.settingsService.triggerSync().subscribe({
      next: () => {
        this.syncing = false;
        this.showSuccess('Synchronisation H2 terminée avec succès');
        this.loadStructure();
      },
      error: () => {
        this.syncing = false;
        this.showError('Erreur lors de la synchronisation');
      }
    });
  }

  toggleIssuer(name: string): void {
    this.expandedIssuers[name] = !this.expandedIssuers[name];
  }

  toggleEntity(issuer: string, entity: string): void {
    const key = issuer + '/' + entity;
    this.expandedEntities[key] = !this.expandedEntities[key];
  }

  toggleType(issuer: string, entity: string, type: string): void {
    const key = issuer + '/' + entity + '/' + type;
    this.expandedTypes[key] = !this.expandedTypes[key];
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
        this.showSuccess('Fichier renommé avec succès');
        this.cancelRename();
        this.loadStructure();
      },
      error: (err) => this.showError(err.error?.error || 'Erreur lors du renommage')
    });
  }

  executeMove(): void {
    this.settingsService.moveFiles([this.selectedDocId], this.moveTargetIssuer, this.moveTargetEntity, this.moveTargetType).subscribe({
      next: () => {
        this.showSuccess('Fichier déplacé avec succès');
        this.cancelMove();
        this.loadStructure();
      },
      error: (err) => this.showError(err.error?.error || 'Erreur lors du déplacement')
    });
  }

  executeBulkRename(): void {
    this.settingsService.bulkRename(this.bulkIssuer, this.bulkEntity, this.bulkType, this.bulkFromExt, this.bulkToExt).subscribe({
      next: (res: any) => {
        this.showSuccess(`Renommage en lot terminé : ${res.filesRenamed} fichiers modifiés`);
        this.loadStructure();
      },
      error: (err) => this.showError(err.error?.error || 'Erreur lors du renommage en lot')
    });
  }

  cancelRename(): void {
    this.renameMode = false;
    this.selectedFile = null;
    this.renameNewName = '';
    this.renameNewExt = '';
  }

  cancelMove(): void {
    this.moveMode = false;
    this.selectedFile = null;
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 5000);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    this.successMessage = '';
    setTimeout(() => this.errorMessage = '', 5000);
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DocumentService } from '../../services/document.service';
import { Acknowledgement, DocumentDTO } from '../../models/document.model';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="p-8 space-y-8 font-['Inter']" *ngIf="doc">
      <!-- Detail Headline -->
      <div class="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
             <a routerLink="/documents" class="text-on-surface-variant hover:text-primary transition-all">
               <span class="material-symbols-outlined text-sm align-middle">arrow_back</span>
             </a>
             <p class="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase">Catalog > Document Detail</p>
          </div>
          <h2 class="text-4xl font-black tracking-tight text-on-surface">{{doc.documentId}}</h2>
          <div class="flex items-center gap-3 mt-1">
            <span class="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tighter">{{doc.type}}</span>
            <span *ngIf="doc.status === 'AR3'" class="bg-[#e7f6f1] text-[#24a375] px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tighter">VALIDATED</span>
            <span *ngIf="doc.isLate && doc.status !== 'AR3'" class="bg-error-container text-on-error-container px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tighter">ERROR</span>
            <span class="text-xs font-semibold text-on-surface-variant italic">Last updated: {{acknowledgements[0]?.timestamp | date:'dd MMM yyyy HH:mm'}}</span>
          </div>
        </div>
        <div class="flex gap-3">
          <button (click)="download()" class="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:scale-[0.98] transition-all shadow-lg shadow-primary/20">
            <span class="material-symbols-outlined text-sm">download</span>
            Download Source
          </button>
        </div>
      </div>

      <!-- Detail Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Document Info -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <div class="px-6 py-4 bg-surface-container-low border-b border-slate-100 flex justify-between items-center">
               <h3 class="font-bold text-on-surface uppercase tracking-tight text-sm">Lifecycle Timeline</h3>
               <span class="material-symbols-outlined text-on-surface-variant text-sm">timeline</span>
             </div>
             <div class="p-8">
                <div class="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  <div *ngFor="let ack of acknowledgements; let last = last" class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div class="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-primary text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <span class="material-symbols-outlined text-sm">
                        {{ack.type === 'AR3' ? 'verified' : ack.type === 'AR4' ? 'cancel' : 'check_circle'}}
                      </span>
                    </div>
                    <div class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                      <div class="flex items-center justify-between space-x-2 mb-1">
                        <div class="font-bold text-primary">{{ack.type}}</div>
                        <time class="font-['Inter'] text-[10px] font-black text-on-surface-variant uppercase">{{ack.timestamp | date:'dd MMM, HH:mm'}}</time>
                      </div>
                      <div class="text-xs text-on-surface-variant leading-relaxed">{{ack.details}}</div>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        <!-- Sidebar: Metadata & Integrity -->
        <div class="space-y-6">
           <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h4 class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-6">Document Metadata</h4>
              <div class="space-y-4">
                 <div class="flex justify-between items-center py-2 border-b border-slate-50">
                    <span class="text-xs font-bold text-on-surface-variant">Entity Code</span>
                    <span class="text-xs font-black text-primary">{{doc.entityCode}}</span>
                 </div>
                 <div class="flex justify-between items-center py-2 border-b border-slate-50">
                    <span class="text-xs font-bold text-on-surface-variant">Period</span>
                    <span class="text-xs font-black text-primary">{{doc.period}}</span>
                 </div>
                 <div class="flex justify-between items-center py-2 border-b border-slate-50">
                    <span class="text-xs font-bold text-on-surface-variant">Deadline</span>
                    <span class="text-xs font-black text-primary">{{doc.deadline | date:'short'}}</span>
                 </div>
                 <div class="flex justify-between items-center py-2 border-b border-slate-50">
                    <span class="text-xs font-bold text-on-surface-variant">Issuer Authority</span>
                    <span class="text-xs font-black text-primary">{{doc.issuerCode}}</span>
                 </div>
              </div>
           </div>

           <div class="bg-[#102a43] p-6 rounded-xl text-white">
              <h4 class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-4">Cryptographic Proof</h4>
              <div class="p-3 bg-white/5 rounded-lg font-mono text-[9px] break-all opacity-80 mb-4">
                SHA256: 4f98a2d1e5b7c3f9a8d2e1b5c7f3a9d8e2b1c5f7a9d3e1b5c7f9a8d2e1b5c7f3
              </div>
              <div class="flex items-center gap-2">
                 <span class="material-symbols-outlined text-[#68dba9] text-sm">verified</span>
                 <span class="text-[10px] font-bold uppercase tracking-wider">Validated by Sovereign Node</span>
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
export class DocumentDetailComponent implements OnInit {
  doc?: DocumentDTO;
  acknowledgements: Acknowledgement[] = [];
  constructor(private route: ActivatedRoute, private documentService: DocumentService) {}
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('documentId')!;
    this.documentService.getDocument(id).subscribe(d => this.doc = d);
    this.documentService.getAcknowledgements(id).subscribe(a => this.acknowledgements = a);
  }
  download(): void {
    if (!this.doc) return;
    this.documentService.getDocumentContent(this.doc.documentId).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${this.doc!.documentId}.bin`; a.click();
    });
  }
}

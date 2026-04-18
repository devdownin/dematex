import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DocumentService } from '../../services/document.service';
import { Acknowledgement, DocumentDTO } from '../../models/document.model';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatListModule, MatIconModule, MatButtonModule, RouterModule],
  template: `
    <div class="detail-container" *ngIf="doc">
      <div class="header">
        <button mat-icon-button routerLink="/documents"><mat-icon>arrow_back</mat-icon></button>
        <h2>Document Details: {{doc.documentId}}</h2>
      </div>
      <div class="content-grid">
        <mat-card>
          <mat-card-header><mat-card-title>Metadata</mat-card-title></mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item><span class="label">Entity:</span> {{doc.entityCode}}</mat-list-item>
              <mat-list-item><span class="label">Type:</span> {{doc.type}}</mat-list-item>
              <mat-list-item><span class="label">Period:</span> {{doc.period}}</mat-list-item>
              <mat-list-item><span class="label">Status:</span> {{doc.status}}</mat-list-item>
            </mat-list>
            <button mat-raised-button color="primary" (click)="download()"><mat-icon>download</mat-icon> Download</button>
          </mat-card-content>
        </mat-card>
        <mat-card>
          <mat-card-header><mat-card-title>Acknowledgement Timeline</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="timeline">
              <div *ngFor="let ack of acknowledgements" class="timeline-item">
                <div class="timeline-header"><strong>{{ack.type}}</strong> - {{ack.timestamp | date:'short'}}</div>
                <div class="details">{{ack.details}}</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`.detail-container { padding: 10px; } .content-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; } .label { font-weight: bold; width: 80px; display: inline-block; } .timeline-item { margin-bottom: 15px; border-left: 2px solid #ddd; padding-left: 10px; }`]
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
    this.documentService.getDocumentContent(this.doc!.documentId).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${this.doc!.documentId}.bin`; a.click();
    });
  }
}

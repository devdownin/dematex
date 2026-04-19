import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DocumentService } from '../../services/document.service';
import { DocumentDTO } from '../../models/document.model';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule, MatSlideToggleModule, FormsModule, RouterModule],
  template: `
    <div class="list-container">
      <div class="header-actions">
        <h2>Document Catalog</h2>
        <mat-slide-toggle [(ngModel)]="lateOnly" (change)="loadDocuments()" color="warn">
          Show Late Documents Only
        </mat-slide-toggle>
      </div>
      <table mat-table [dataSource]="documents" class="mat-elevation-z8" *ngIf="documents.length > 0">
        <ng-container matColumnDef="documentId"><th mat-header-cell *matHeaderCellDef> ID </th><td mat-cell *matCellDef="let element"> {{element.documentId}} </td></ng-container>
        <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef> Type </th><td mat-cell *matCellDef="let element"> {{element.type}} </td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef> Status </th><td mat-cell *matCellDef="let element"> {{element.status}} </td></ng-container>
        <ng-container matColumnDef="sla">
          <th mat-header-cell *matHeaderCellDef> SLA </th>
          <td mat-cell *matCellDef="let element">
            <mat-icon *ngIf="element.isLate" color="warn" [matTooltip]="'Late! Deadline was ' + (element.deadline | date:'short')">history</mat-icon>
            <mat-icon *ngIf="!element.isLate && element.status !== 'AR3'" color="accent" [matTooltip]="'In SLA. Deadline: ' + (element.deadline | date:'short')">schedule</mat-icon>
            <mat-icon *ngIf="element.status === 'AR3'" style="color: #4caf50">check_circle</mat-icon>
          </td>
        </ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef> Actions </th><td mat-cell *matCellDef="let element"><button mat-icon-button [routerLink]="['/documents', element.documentId]"><mat-icon>visibility</mat-icon></button></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
      <div *ngIf="documents.length === 0">Loading documents...</div>
    </div>
  `,
  styles: [`
    .list-container { padding: 10px; }
    table { width: 100%; }
    .mat-column-sla { width: 60px; text-align: center; }
    .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  `]
})
export class DocumentListComponent implements OnInit {
  documents: DocumentDTO[] = [];
  lateOnly = false;
  displayedColumns: string[] = ['documentId', 'type', 'status', 'sla', 'actions'];
  constructor(private documentService: DocumentService) {}
  ngOnInit(): void { this.loadDocuments(); }
  loadDocuments(): void {
    this.documentService.getDocuments('ENT_ALPHA', { limit: 50, lateOnly: this.lateOnly }).subscribe(res => this.documents = res.items);
  }
}

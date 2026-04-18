import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { DocumentService } from '../../services/document.service';
import { DocumentDTO } from '../../models/document.model';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, RouterModule],
  template: `
    <div class="list-container">
      <h2>Document Catalog</h2>
      <table mat-table [dataSource]="documents" class="mat-elevation-z8" *ngIf="documents.length > 0">
        <ng-container matColumnDef="documentId"><th mat-header-cell *matHeaderCellDef> ID </th><td mat-cell *matCellDef="let element"> {{element.documentId}} </td></ng-container>
        <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef> Type </th><td mat-cell *matCellDef="let element"> {{element.type}} </td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef> Status </th><td mat-cell *matCellDef="let element"> {{element.status}} </td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef> Actions </th><td mat-cell *matCellDef="let element"><button mat-icon-button [routerLink]="['/documents', element.documentId]"><mat-icon>visibility</mat-icon></button></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
      <div *ngIf="documents.length === 0">Loading documents...</div>
    </div>
  `,
  styles: [`.list-container { padding: 10px; } table { width: 100%; }`]
})
export class DocumentListComponent implements OnInit {
  documents: DocumentDTO[] = [];
  displayedColumns: string[] = ['documentId', 'type', 'status', 'actions'];
  constructor(private documentService: DocumentService) {}
  ngOnInit(): void { this.documentService.getDocuments('ENT001', { limit: 50 }).subscribe(res => this.documents = res.items); }
}

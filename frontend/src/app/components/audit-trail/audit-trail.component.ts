import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-audit-trail',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="audit-container">
      <div class="header">
        <h2>Audit Trail & Access Logs</h2>
        <button mat-stroked-button color="primary">
          <mat-icon>download</mat-icon> Export CSV
        </button>
      </div>

      <mat-card>
        <table mat-table [dataSource]="logs" class="mat-elevation-z0">
          <ng-container matColumnDef="timestamp">
            <th mat-header-cell *matHeaderCellDef> Timestamp </th>
            <td mat-cell *matCellDef="let log"> {{log.timestamp | date:'medium'}} </td>
          </ng-container>
          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef> User </th>
            <td mat-cell *matCellDef="let log"> {{log.user}} </td>
          </ng-container>
          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef> Action </th>
            <td mat-cell *matCellDef="let log"> {{log.action}} </td>
          </ng-container>
          <ng-container matColumnDef="resource">
            <th mat-header-cell *matHeaderCellDef> Resource </th>
            <td mat-cell *matCellDef="let log"> {{log.resource}} </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </mat-card>
    </div>
  `,
  styles: [`
    .audit-container { padding: 10px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    table { width: 100%; }
  `]
})
export class AuditTrailComponent implements OnInit {
  displayedColumns: string[] = ['timestamp', 'user', 'action', 'resource'];
  logs = [
    { timestamp: new Date(), user: 'admin@dematex.com', action: 'LOGIN', resource: 'System' },
    { timestamp: new Date(Date.now() - 500000), user: 'admin@dematex.com', action: 'VIEW_DOCUMENT', resource: 'DOC-0001' },
    { timestamp: new Date(Date.now() - 1000000), user: 'etl_user', action: 'API_EXTRACT', resource: 'Documents Delta' },
    { timestamp: new Date(Date.now() - 2000000), user: 'admin@dematex.com', action: 'DOWNLOAD_CONTENT', resource: 'DOC-0042' }
  ];
  constructor() {}
  ngOnInit(): void {}
}

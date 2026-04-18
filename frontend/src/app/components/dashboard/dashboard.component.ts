import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { DocumentService } from '../../services/document.service';
import { DashboardStats } from '../../models/document.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatGridListModule, MatCardModule, MatIconModule],
  template: `
    <div class="dashboard-container">
      <h2>Operational Dashboard</h2>
      <mat-grid-list cols="4" rowHeight="150px" gutterSize="16px" *ngIf="stats">
        <mat-grid-tile>
          <mat-card class="kpi-card">
            <mat-card-header><mat-icon color="primary">description</mat-icon><mat-card-title>Total Documents</mat-card-title></mat-card-header>
            <mat-card-content><div class="kpi-value">{{stats.totalDocuments}}</div></mat-card-content>
          </mat-card>
        </mat-grid-tile>
        <mat-grid-tile>
          <mat-card class="kpi-card">
            <mat-card-header><mat-icon color="accent">verified_user</mat-icon><mat-card-title>AR-3 Completed</mat-card-title></mat-card-header>
            <mat-card-content><div class="kpi-value">{{stats.ar3CompletionRate | number:'1.0-1'}}%</div></mat-card-content>
          </mat-card>
        </mat-grid-tile>
        <mat-grid-tile>
          <mat-card class="kpi-card">
            <mat-card-header><mat-icon color="warn">error</mat-icon><mat-card-title>AR-3 Pending</mat-card-title></mat-card-header>
            <mat-card-content><div class="kpi-value">{{stats.ar3Pending}}</div></mat-card-content>
          </mat-card>
        </mat-grid-tile>
        <mat-grid-tile>
          <mat-card class="kpi-card">
            <mat-card-header><mat-icon color="primary">speed</mat-icon><mat-card-title>Sync Status</mat-card-title></mat-card-header>
            <mat-card-content><div class="kpi-value">Live</div></mat-card-content>
          </mat-card>
        </mat-grid-tile>
      </mat-grid-list>
      <div *ngIf="!stats">Loading stats...</div>
    </div>
  `,
  styles: [`.dashboard-container { padding: 10px; } .kpi-card { width: 100%; height: 100%; } .kpi-value { font-size: 2rem; font-weight: bold; margin-top: 10px; }`]
})
export class DashboardComponent implements OnInit {
  stats?: DashboardStats;
  constructor(private documentService: DocumentService) {}
  ngOnInit(): void { this.documentService.getStats().subscribe(s => this.stats = s); }
}

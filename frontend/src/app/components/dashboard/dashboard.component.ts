import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { DocumentService } from '../../services/document.service';
import { DashboardStats } from '../../models/document.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatGridListModule, MatCardModule, MatIconModule, BaseChartDirective],
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
          <mat-card class="kpi-card warn" [class.highlight-warn]="stats.lateDocuments > 0">
            <mat-card-header><mat-icon color="warn">history</mat-icon><mat-card-title>Late (SLA Violation)</mat-card-title></mat-card-header>
            <mat-card-content><div class="kpi-value">{{stats.lateDocuments}}</div></mat-card-content>
          </mat-card>
        </mat-grid-tile>
        <mat-grid-tile>
          <mat-card class="kpi-card">
            <mat-card-header><mat-icon color="primary">speed</mat-icon><mat-card-title>Sync Status</mat-card-title></mat-card-header>
            <mat-card-content><div class="kpi-value">Live</div></mat-card-content>
          </mat-card>
        </mat-grid-tile>
      </mat-grid-list>

      <div class="charts-container" *ngIf="stats">
        <mat-card>
          <mat-card-header><mat-card-title>SLA & Legal Compliance</mat-card-title></mat-card-header>
          <mat-card-content>
            <div style="display: block; height: 300px;">
              <canvas baseChart
                [data]="pieChartData"
                [type]="pieChartType"
                [options]="pieChartOptions">
              </canvas>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <div *ngIf="!stats">Loading dashboard...</div>
    </div>
  `,
  styles: [`
    .dashboard-container { padding: 10px; }
    .kpi-card { width: 100%; height: 100%; }
    .kpi-value { font-size: 2rem; font-weight: bold; margin-top: 10px; }
    .charts-container { margin-top: 20px; display: grid; grid-template-columns: 1fr; gap: 20px; }
    .highlight-warn { border: 2px solid #f44336; }
  `]
})
export class DashboardComponent implements OnInit {
  stats?: DashboardStats;

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' } }
  };
  public pieChartData: ChartConfiguration['data'] = {
    labels: ['AR-3 Completed', 'Late (SLA Violation)', 'Pending (In SLA)'],
    datasets: [{ data: [0, 0, 0] }]
  };
  public pieChartType: ChartType = 'pie';

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.documentService.getStats().subscribe(s => {
      this.stats = s;
      const inSlaPending = s.totalDocuments - s.ar3Completed - s.lateDocuments;
      this.pieChartData = {
        labels: ['AR-3 Completed', 'Late (SLA Violation)', 'Pending (In SLA)'],
        datasets: [{
          data: [s.ar3Completed, s.lateDocuments, inSlaPending],
          backgroundColor: ['#4caf50', '#f44336', '#ff9800']
        }]
      };
    });
  }
}

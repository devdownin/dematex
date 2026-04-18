import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatSidenavModule, MatListModule, MatToolbarModule, MatIconModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button (click)="sidenav.toggle()"><mat-icon>menu</mat-icon></button>
      <span>Dematex Supervision</span>
    </mat-toolbar>
    <mat-sidenav-container style="height: calc(100vh - 64px);">
      <mat-sidenav #sidenav mode="side" opened style="width: 200px;">
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard">Dashboard</a>
          <a mat-list-item routerLink="/documents">Documents</a>
          <a mat-list-item routerLink="/audit">Audit Trail</a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content style="padding: 20px;">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `
})
export class LayoutComponent {}

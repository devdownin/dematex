import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DocumentListComponent } from './components/document-list/document-list.component';
import { DocumentDetailComponent } from './components/document-detail/document-detail.component';
import { AuditTrailComponent } from './components/audit-trail/audit-trail.component';
import { SystemSettingsComponent } from './components/system-settings/system-settings.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'documents', component: DocumentListComponent },
      { path: 'documents/:documentId', component: DocumentDetailComponent },
      { path: 'audit', component: AuditTrailComponent },
      { path: 'settings', component: SystemSettingsComponent }
    ]
  }
];

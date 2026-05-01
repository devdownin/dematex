import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AlertsComponent } from './components/alerts/alerts.component';
import { DocumentListComponent } from './components/document-list/document-list.component';
import { DocumentDetailComponent } from './components/document-detail/document-detail.component';
import { AuditTrailComponent } from './components/audit-trail/audit-trail.component';
import { SystemSettingsComponent } from './components/system-settings/system-settings.component';
import { LoginComponent } from './components/login/login.component';
import { adminGuard } from './admin.guard';
import { ClientApiConsoleComponent } from './components/client-api-console/client-api-console.component';
import { TechnicalResourcesComponent } from './components/technical-resources/technical-resources.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'alerts', component: AlertsComponent },
      { path: 'documents', component: DocumentListComponent },
      { path: 'documents/:documentId', component: DocumentDetailComponent },
      { path: 'client-apis', component: ClientApiConsoleComponent },
      { path: 'tech-resources', component: TechnicalResourcesComponent },
      { path: 'audit', component: AuditTrailComponent },
      { path: 'settings', component: SystemSettingsComponent, canActivate: [adminGuard] }
    ]
  },
  { path: '**', redirectTo: '' }
];

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

export interface PortalConfig {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  readonly config = signal<PortalConfig | null>(null);

  constructor(private http: HttpClient) {}

  loadConfig() {
    return this.http.get<PortalConfig>('/api/v1/config').pipe(
      tap(conf => {
        this.config.set(conf);
        this.applyBranding(conf);
      })
    );
  }

  private applyBranding(conf: PortalConfig) {
    if (conf.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', conf.primaryColor);
    }
  }
}

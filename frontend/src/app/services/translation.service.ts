import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { firstValueFrom, from, Observable, tap } from 'rxjs';

export type Lang = 'en' | 'fr';

const STORAGE_KEY = 'dematex-lang';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly http = inject(HttpClient);
  readonly lang = signal<Lang>(this.loadLang());
  private readonly translations = signal<Record<string, string>>({});

  init(): Observable<any> {
    registerLocaleData(localeFr, 'fr-FR');
    return from(this.loadTranslations(this.lang()));
  }

  t(key: string, params?: Record<string, string | number>): string {
    const text = this.translations()[key] || key;
    if (!params) return text;
    
    let result = text;
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{${k}}`, String(v));
    }
    return result;
  }

  async setLang(lang: Lang): Promise<void> {
    await this.loadTranslations(lang);
    this.lang.set(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    
    // Most Angular pipes (DatePipe, CurrencyPipe, etc) read LOCALE_ID only at startup.
    // For a real-time production app, we would use a more complex dynamic locale logic,
    // but a reload is the standard safe way to ensure ALL pipes update their format.
    window.location.reload(); 
  }

  toggleLang(): void {
    const next = this.lang() === 'en' ? 'fr' : 'en';
    this.setLang(next);
  }

  private async loadTranslations(lang: Lang): Promise<void> {
    try {
      const data = await firstValueFrom(this.http.get<Record<string, string>>(`/i18n/${lang}.json`));
      this.translations.set(data);
    } catch (err) {
      console.error(`Could not load translations for ${lang}`, err);
      // Fallback to empty if error
      this.translations.set({});
    }
  }

  private loadLang(): Lang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'fr' || stored === 'en') return stored;
    } catch {}
    return 'en';
  }
}

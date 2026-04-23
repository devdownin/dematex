import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { APP_INITIALIZER } from '@angular/core';
import { ConfigService } from './services/config.service';
import { AuthService } from './services/auth.service';
import { authInterceptor } from './services/auth.interceptor';
import { catchError, of, switchMap } from 'rxjs';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    provideCharts(withDefaultRegisterables()),
    {
      provide: APP_INITIALIZER,
      useFactory: (authService: AuthService, configService: ConfigService) => () =>
        authService.autoLogin().pipe(
          switchMap(() => configService.loadConfig()),
          catchError(() => of(null))
        ),
      deps: [AuthService, ConfigService],
      multi: true
    }
  ]
};

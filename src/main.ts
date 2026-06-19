import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
// 1. Importa el definidor de elementos PWA
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';

// 2. Llama a la función antes o justo después del bootstrap
defineCustomElements(window);


bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          }),
  ],
})
  .catch((err) => console.error(err));

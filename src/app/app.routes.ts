import { Routes } from '@angular/router';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.page').then(
        m => m.HomePage
      ),
  },

  {
    path: 'gastos',
    loadComponent: () =>
      import('./gastos/gastos.page').then(
        m => m.GastosPage
      ),
  },

  {
    path: 'escanear',
    loadComponent: () =>
      import('./escanear/escanear.page').then(
        m => m.EscanearPage
      ),
  },

  {
    path: 'resumen',
    loadComponent: () =>
      import('./resumen/resumen.page').then(
        m => m.ResumenPage
      ),
  },
  {
    path: 'nuevogasto',
    loadComponent: () => import('./nuevogasto/nuevogasto.page').then( m => m.NuevogastoPage)
  },

];
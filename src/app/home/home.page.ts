import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  IonContent,
  IonIcon,
  IonFab,
  IonFabButton,
  IonFooter
} from '@ionic/angular/standalone';

import { RouterModule } from '@angular/router';

import { Router } from '@angular/router';

import { SupabaseServicio } from '../servicios/supabase.servicio';

import { addIcons } from 'ionicons';

import {

  walletOutline,
  notificationsOutline,
  trendingUpOutline,
  calendarOutline,
  receiptOutline,
  restaurantOutline,
  qrCodeOutline,
  chevronForwardOutline,
  cartOutline,
  carOutline,
  cafeOutline,
  add,
  home,
  scanOutline,
  barChartOutline

} from 'ionicons/icons';

@Component({

  selector: 'app-home',

  templateUrl: './home.page.html',

  styleUrls: ['./home.page.scss'],

  standalone: true,

  imports: [
    IonContent,
    IonIcon,
    IonFab,
    IonFabButton,
    IonFooter,
    CommonModule,
    RouterModule
  ],

})

export class HomePage {

  // =====================================
  // VARIABLES
  // =====================================

  gastosRecientes: any[] = [];

  totalMes: number = 0;

  cantidadGastos: number = 0;

  categoriaTop: string = 'Sin datos';

  cargando: boolean = false;

  constructor(

    private router: Router,

    private supabaseServicio: SupabaseServicio

  ) {

    addIcons({

      walletOutline,
      notificationsOutline,
      trendingUpOutline,
      calendarOutline,
      receiptOutline,
      restaurantOutline,
      qrCodeOutline,
      chevronForwardOutline,
      cartOutline,
      carOutline,
      cafeOutline,
      add,
      home,
      scanOutline,
      barChartOutline

    });

  }

  // =====================================
  // CUANDO ENTRA A LA VISTA
  // =====================================

  async ionViewWillEnter() {

    await this.cargarDatos();

  }

  // =====================================
  // CARGAR DATOS
  // =====================================

  async cargarDatos() {

    this.cargando = true;

    try {

      // =====================================
      // GASTOS RECIENTES
      // =====================================

      const datosHome = await this.supabaseServicio.obtenerGastosRecientes();
      this.gastosRecientes = datosHome.map((g: any) => {
        let catNombre = 'Otros';
        if (g.categoria_id === 1) catNombre = 'Comida';
        else if (g.categoria_id === 2) catNombre = 'Transporte';
        else if (g.categoria_id === 3) catNombre = 'Servicios';
        else if (g.categoria_id === 4) catNombre = 'Entretenimiento';
        
        return {
          ...g,
          fecha: g.fecha_gasto, 
          categoria: catNombre,
          concepto: g.concepto 
        };
      });

      // =====================================
      // TOTAL DEL MES
      // =====================================

      this.totalMes =
        await this.supabaseServicio
        .obtenerTotalMes();

      // =====================================
      // CANTIDAD GASTOS
      // =====================================

      this.cantidadGastos =
        this.gastosRecientes.length;

      // =====================================
      // CATEGORIA TOP
      // =====================================

      const categorias: any = {};

      this.gastosRecientes.forEach((gasto: any) => {

        const categoria =
          gasto.categoria || 'Otros';

        if (!categorias[categoria]) {

          categorias[categoria] = 0;

        }

        categorias[categoria]++;

      });

      let categoriaMayor = 'Otros';

      let cantidadMayor = 0;

      for (const categoria in categorias) {

        if (
          categorias[categoria] >
          cantidadMayor
        ) {

          cantidadMayor =
            categorias[categoria];

          categoriaMayor = categoria;

        }

      }

      this.categoriaTop =
        categoriaMayor;

    } catch(error) {

      console.error(
        'ERROR HOME:',
        error
      );

    } finally {

      this.cargando = false;

    }

  }

  // =====================================
  // IR NUEVO GASTO
  // =====================================

  irNuevoGasto() {

    this.router.navigate([
      '/nuevogasto'
    ]);

  }

  // =====================================
  // FORMATO DINERO
  // =====================================

  formatoMoneda(
    valor: number
  ) {

    return valor.toLocaleString(
      'es-MX',
      {

        minimumFractionDigits: 2,

        maximumFractionDigits: 2

      }
    );

  }

}
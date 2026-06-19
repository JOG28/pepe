import { Component, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';

import { IonicModule } from '@ionic/angular';

import { RouterModule } from '@angular/router';

import { addIcons } from 'ionicons';

import {

  walletOutline,
  notificationsOutline,
  trendingUpOutline,
  restaurantOutline,
  bulbOutline,
  carOutline,
  shapesOutline,
  homeOutline,
  scanOutline,
  barChartOutline

} from 'ionicons/icons';

import { SupabaseServicio }
from '../servicios/supabase.servicio';

@Component({

  selector: 'app-resumen',

  templateUrl: './resumen.page.html',

  styleUrls: ['./resumen.page.scss'],

  standalone: true,

  imports: [

    IonicModule,
    CommonModule,
    RouterModule

  ],

})

export class ResumenPage
implements OnInit {

  // =====================================
  // VARIABLES
  // =====================================

  gastos: any[] = [];

  total: number = 0;

  categoriaTop: string = '';

  porcentajeTop: number = 0;

  totalTop: number = 0;

  graficaStyle: string = '';

  categoriasResumen: any[] = [];

  colores: string[] = [

    '#0057d9',
    '#ff3b30',
    '#34c759',
    '#ff9500',
    '#af52de',
    '#00c7be',
    '#ff2d55',
    '#5856d6'

  ];

  // =====================================
  // CONSTRUCTOR
  // =====================================

  constructor(

    private supabaseServicio:
    SupabaseServicio

  ) {

    addIcons({

      walletOutline,
      notificationsOutline,
      trendingUpOutline,
      restaurantOutline,
      bulbOutline,
      carOutline,
      shapesOutline,
      homeOutline,
      scanOutline,
      barChartOutline

    });

  }

  // =====================================
  // INIT
  // =====================================

  ngOnInit() {

    this.obtenerGastos();

  }

  // =====================================
  // OBTENER GASTOS
  // =====================================

  async obtenerGastos() {

    try {

      const {

        data,
        error

      } = await this
      .supabaseServicio
      .supabase
      .from('gastos')
      .select('*')
      .order('fecha_creacion', {
        ascending: false
      });

      if (error) {

        console.error(error);

        return;

      }

      this.gastos = (data || []).map((g: any) => {
        let catNombre = 'Otros';
        if (g.categoria_id === 1) catNombre = 'Comida';
        else if (g.categoria_id === 2) catNombre = 'Transporte';
        else if (g.categoria_id === 3) catNombre = 'Servicios';
        else if (g.categoria_id === 4) catNombre = 'Entretenimiento';
        return {
          ...g,
          categoria: catNombre
        };
      });

      this.calcularResumen();

    } catch(error) {

      console.error(
        'ERROR:',
        error
      );

    }

  }

  // =====================================
  // CALCULAR TODO
  // =====================================

  calcularResumen() {

    // =====================================
    // TOTAL
    // =====================================

    this.total = this.gastos
    .reduce((acc, gasto) => {

      return acc + Number(gasto.monto);

    }, 0);

    // =====================================
    // AGRUPAR
    // =====================================

    const agrupados: any = {};

    this.gastos.forEach((gasto) => {

      const categoria =
        gasto.categoria ||
        'Sin categoría';

      if (!agrupados[categoria]) {

        agrupados[categoria] = 0;

      }

      agrupados[categoria] +=
        Number(gasto.monto);

    });

    // =====================================
    // CONVERTIR ARRAY
    // =====================================

    this.categoriasResumen =
    Object.keys(agrupados)
    .map((categoria, index) => {

      const totalCategoria =
        agrupados[categoria];

      const porcentaje =
        this.total > 0

        ?

        (totalCategoria * 100)
        / this.total

        :

        0;

      return {

        nombre: categoria,

        total: totalCategoria,

        porcentaje:
          porcentaje.toFixed(1),

        color:
          this.colores[
            index %
            this.colores.length
          ]

      };

    });

    // =====================================
    // ORDENAR
    // =====================================

    this.categoriasResumen.sort(

      (a, b) => b.total - a.total

    );

    // =====================================
    // TOP
    // =====================================

    if (
      this.categoriasResumen.length > 0
    ) {

      this.categoriaTop =
        this.categoriasResumen[0]
        .nombre;

      this.porcentajeTop =
        Number(
          this.categoriasResumen[0]
          .porcentaje
        );

      this.totalTop =
        this.categoriasResumen[0]
        .total;

    }

    // =====================================
    // GRAFICA
    // =====================================

    this.generarGrafica();

  }

  // =====================================
  // GRAFICA CIRCULAR
  // =====================================

  generarGrafica() {

    if (
      this.categoriasResumen.length === 0
    ) {

      this.graficaStyle =
        '#ececec 0deg 360deg';

      return;

    }

    let inicio = 0;

    let gradiente = '';

    this.categoriasResumen
    .forEach((item, index) => {

      const grados =

        (Number(item.porcentaje)
        / 100)

        * 360;

      const fin =
        inicio + grados;

      gradiente += `

        ${item.color}
        ${inicio}deg
        ${fin}deg

      `;

      if (

        index !==
        this.categoriasResumen.length - 1

      ) {

        gradiente += ',';

      }

      inicio = fin;

    });

    this.graficaStyle = gradiente;

  }

  // =====================================
  // COLOR ICONO
  // =====================================

  obtenerClaseColor(index: number) {

    const clases = [

      'azul',
      'rojo',
      'gris',
      'verde'

    ];

    return clases[
      index % clases.length
    ];

  }

  // =====================================
  // ICONOS
  // =====================================

  obtenerIcono(categoria: string) {

    categoria =
      categoria.toLowerCase();

    if (
      categoria.includes('comida')
    ) {

      return 'restaurant-outline';

    }

    if (
      categoria.includes('transporte')
    ) {

      return 'car-outline';

    }

    if (
      categoria.includes('servicio')
    ) {

      return 'bulb-outline';

    }

    return 'shapes-outline';

  }

}
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseServicio } from '../servicios/supabase.servicio';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  searchOutline,
  ellipsisVertical,
  calendarOutline,
  homeOutline,
  scanOutline,
  barChartOutline,
  add,
  wifiOutline,
  medicalOutline,
  carOutline,
  cafeOutline,
  pencilOutline,
  trashOutline
} from 'ionicons/icons';

// Importamos individualmente los componentes de Ionic para que no truene la app
import { 
  IonContent, 
  IonIcon, 
  IonFab, 
  IonFabButton, 
  IonFooter, 
  IonModal, 
  IonDatetime, 
  IonButton 
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-gastos',
  templateUrl: './gastos.page.html',
  styleUrls: ['./gastos.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonFab,
    IonFabButton,
    IonFooter,
    IonModal,
    IonDatetime,
    IonButton
  ],
})
export class GastosPage {

  // =====================================
  // VARIABLES
  // =====================================
  gastos: any[] = [];
  gastosFiltrados: any[] = [];
  cargando: boolean = false;
  totalGastos: number = 0;
  buscador: string = '';
  
  fechaFiltroSeleccionada: string | null = null; 

  // Límites dinámicos basados en tu SQL (2026)
  anioMinimo: string = '2026';
  anioMaximo: string = '2026';

  // =====================================
  // CONSTRUCTOR
  // =====================================
  constructor(
    private router: Router,
    private supabaseServicio: SupabaseServicio
  ) {
    addIcons({
      walletOutline,
      searchOutline,
      ellipsisVertical,
      calendarOutline,
      homeOutline,
      scanOutline,
      barChartOutline,
      add,
      wifiOutline,
      medicalOutline,
      carOutline,
      cafeOutline,
      pencilOutline,
      trashOutline
    });
  }

  // =====================================
  // AL ENTRAR
  // =====================================
  async ionViewWillEnter() {
    await this.cargarGastos();
  }

  // =====================================
  // CARGAR
  // =====================================
  async cargarGastos() {
    this.cargando = true;
    try {
      const datosBD = await this.supabaseServicio.obtenerGastos();
      this.gastos = datosBD.map((g: any) => {
        let catNombre = 'Otros';
        if (g.categoria_id === 1) catNombre = 'Comida';
        else if (g.categoria_id === 2) catNombre = 'Transporte';
        else if (g.categoria_id === 3) catNombre = 'Servicios';
        else if (g.categoria_id === 4) catNombre = 'Entretenimiento';
        
        return {
          ...g,
          fecha: g.fecha_gasto, 
          categoria: catNombre 
        };
      });
      this.calcularLimitesFechas();
      this.aplicarFiltrosCombinados();
    } catch(error) {
      console.error('ERROR CARGAR:', error);
    } finally {
      this.cargando = false;
    }
  }

  // =====================================
  // CALCULAR LIMITES DESDE TU BDA
  // =====================================
  calcularLimitesFechas() {
    if (!this.gastos || this.gastos.length === 0) return;

    const anios = this.gastos
      .map(g => g.fecha ? new Date(g.fecha).getUTCFullYear() : null)
      .filter(anio => anio !== null && !isNaN(anio)) as number[];

    if (anios.length > 0) {
      const min = Math.min(...anios);
      const max = Math.max(...anios);
      this.anioMinimo = `${min}`;
      this.anioMaximo = `${max}`;
    }
  }

  // =====================================
  // CONFIRMACIÓN MANUAL (BOTÓN ACEPTAR)
  // =====================================
  async aplicarSeleccionFecha(datetimeComponent: any, modalComponent: any) {
    const fechaCompleta = await datetimeComponent.value; 
    
    if (fechaCompleta) {
      // Cortamos para obtener solo "YYYY-MM"
      this.fechaFiltroSeleccionada = fechaCompleta.substring(0, 7);
      this.aplicarFiltrosCombinados();
    }
    modalComponent.dismiss();
  }

  limpiarFiltroFecha() {
    this.fechaFiltroSeleccionada = null;
    this.aplicarFiltrosCombinados();
  }

  // =====================================
  // FILTRADO CENTRALIZADO
  // =====================================
  aplicarFiltrosCombinados() {
    let resultado = [...this.gastos];

    // 1. Buscador por texto
    const texto = this.buscador.toLowerCase().trim();
    if (texto) {
      resultado = resultado.filter((gasto: any) =>
        gasto.concepto?.toLowerCase().includes(texto) ||
        gasto.categoria?.toLowerCase().includes(texto)
      );
    }

    // 2. Buscador por Fecha
    if (this.fechaFiltroSeleccionada) {
      resultado = resultado.filter((gasto: any) => {
        return gasto.fecha && gasto.fecha.includes(this.fechaFiltroSeleccionada);
      });
    }

    this.gastosFiltrados = resultado;
    this.calcularTotal();
  }

  calcularTotal() {
    this.totalGastos = 0;
    this.gastosFiltrados.forEach((gasto: any) => {
      this.totalGastos += Number(gasto.monto);
    });
  }

  filtrarGastos() {
    this.aplicarFiltrosCombinados();
  }

  // =====================================
  // ELIMINAR
  // =====================================
  async eliminarGasto(id: number) {
    const confirmar = confirm('¿Eliminar gasto?');
    if (!confirmar) return;

    const eliminado = await this.supabaseServicio.eliminarGasto(id);
    if (eliminado) {
      await this.cargarGastos();
    }
  }

  // =====================================
  // EDITAR GASTO
  // =====================================
  editarGasto(id: number) {
    const gasto = this.gastos.find(g => g.id === id);
    if (gasto) {
      this.router.navigate(['/nuevogasto'], {
        state: { gastoAEditar: gasto }
      });
    }
  }

  // =====================================
  // RUTAS Y UTILERÍAS
  // =====================================
  irNuevoGasto() {
    this.router.navigate(['/nuevogasto']);
  }

  formatoMoneda(valor: number) {
    return Number(valor).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  obtenerIcono(categoria: string) {
    switch(categoria) {
      case 'Comida': return 'cafe-outline';
      case 'Transporte': return 'car-outline';
      case 'Salud': return 'medical-outline';
      case 'Servicios': return 'wifi-outline';
      default: return 'wallet-outline';
    }
  }
}
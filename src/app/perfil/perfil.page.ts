import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  personOutline,
  mailOutline,
  calendarOutline,
  shieldCheckmarkOutline,
  createOutline,
  logOutOutline,
  walletOutline,
  receiptOutline,
  trendingUpOutline,
  settingsOutline,
  moonOutline,
  notificationsOutline,
  helpCircleOutline,
  chevronForwardOutline,
  checkmarkOutline,
  closeOutline,
  cameraOutline,
  statsChartOutline,
  cardOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { SupabaseServicio } from '../servicios/supabase.servicio';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    CommonModule,
    FormsModule,
    RouterModule,
  ],
})
export class PerfilPage {

  // Datos del usuario
  nombre = '';
  email = '';
  fechaCreacion = '';
  iniciales = '';

  // Estadísticas
  totalGastos = 0;
  gastosMes = 0;
  categoriaFavorita = 'Sin datos';

  // Edición
  editandoNombre = false;
  nombreEditado = '';

  // Estado
  cargando = true;

  // Toast
  mostrarToast = false;
  toastExito = false;
  mensajeToast = '';

  constructor(
    private router: Router,
    private supabase: SupabaseServicio
  ) {
    addIcons({
      chevronBackOutline,
      personOutline,
      mailOutline,
      calendarOutline,
      shieldCheckmarkOutline,
      createOutline,
      logOutOutline,
      walletOutline,
      receiptOutline,
      trendingUpOutline,
      settingsOutline,
      moonOutline,
      notificationsOutline,
      helpCircleOutline,
      chevronForwardOutline,
      checkmarkOutline,
      closeOutline,
      cameraOutline,
      statsChartOutline,
      cardOutline,
      sparklesOutline,
    });
  }

  async ionViewWillEnter() {
    await this.cargarPerfil();
  }

  async cargarPerfil() {
    this.cargando = true;

    try {
      const user = await this.supabase.obtenerUsuario();
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      this.nombre = user.user_metadata?.['nombre'] || 'Usuario';
      this.email = user.email || '';
      this.iniciales = this.obtenerIniciales(this.nombre);

      // Fecha de creación formateada
      if (user.created_at) {
        const fecha = new Date(user.created_at);
        this.fechaCreacion = fecha.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }

      // Cargar estadísticas
      const gastos = await this.supabase.obtenerGastos();
      this.totalGastos = gastos.length;

      this.gastosMes = await this.supabase.obtenerTotalMes();

      // Calcular categoría favorita
      if (gastos.length > 0) {
        const categorias: { [key: string]: number } = {};
        gastos.forEach((g: any) => {
          let cat = 'Otros';
          if (g.categoria_id === 1) cat = 'Comida';
          else if (g.categoria_id === 2) cat = 'Transporte';
          else if (g.categoria_id === 3) cat = 'Servicios';
          else if (g.categoria_id === 4) cat = 'Entretenimiento';
          categorias[cat] = (categorias[cat] || 0) + 1;
        });

        let maxCat = 'Otros';
        let maxCount = 0;
        for (const cat in categorias) {
          if (categorias[cat] > maxCount) {
            maxCount = categorias[cat];
            maxCat = cat;
          }
        }
        this.categoriaFavorita = maxCat;
      }

    } catch (error) {
      console.error('Error al cargar perfil:', error);
    } finally {
      this.cargando = false;
    }
  }

  obtenerIniciales(nombre: string): string {
    if (!nombre) return 'U';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return partes[0][0].toUpperCase();
  }

  volver() {
    this.router.navigate(['/home']);
  }

  // =====================================
  // EDITAR NOMBRE
  // =====================================

  iniciarEdicion() {
    this.nombreEditado = this.nombre;
    this.editandoNombre = true;
  }

  cancelarEdicion() {
    this.editandoNombre = false;
    this.nombreEditado = '';
  }

  async guardarNombre() {
    if (!this.nombreEditado || this.nombreEditado.trim().length < 2) {
      this.mostrarMensaje('El nombre debe tener al menos 2 caracteres', false);
      return;
    }

    const resultado = await this.supabase.actualizarPerfil({
      nombre: this.nombreEditado.trim()
    });

    if (resultado.success) {
      this.nombre = this.nombreEditado.trim();
      this.iniciales = this.obtenerIniciales(this.nombre);
      this.editandoNombre = false;
      this.mostrarMensaje('¡Nombre actualizado correctamente!', true);
    } else {
      this.mostrarMensaje(resultado.error || 'Error al actualizar', false);
    }
  }

  // =====================================
  // CERRAR SESIÓN
  // =====================================

  async cerrarSesion() {
    try {
      await this.supabase.cerrarSesion();
      this.mostrarMensaje('Sesión cerrada', true);
      setTimeout(() => this.router.navigate(['/home']), 1000);
    } catch (error) {
      this.mostrarMensaje('Error al cerrar sesión', false);
    }
  }

  // =====================================
  // FORMATO
  // =====================================

  formatoMoneda(valor: number): string {
    return valor.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  mostrarMensaje(mensaje: string, exito: boolean) {
    this.mensajeToast = mensaje;
    this.toastExito = exito;
    this.mostrarToast = true;
    setTimeout(() => this.mostrarToast = false, 3500);
  }
}

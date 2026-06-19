import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonFooter,
  IonSpinner
} from '@ionic/angular/standalone';
import { Router, RouterModule } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  homeOutline,
  scanOutline,
  barChartOutline,
  cameraOutline,
  imagesOutline,
  trashOutline,
  sparklesOutline
} from 'ionicons/icons';
import {
  Camera,
  CameraResultType,
  CameraSource
} from '@capacitor/camera';
import { SupabaseServicio } from '../servicios/supabase.servicio';
import { IAService } from '../servicios/ia.service';

@Component({
  selector: 'app-escanear',
  templateUrl: './escanear.page.html',
  styleUrls: ['./escanear.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    IonFooter,
    IonSpinner,
    CommonModule,
    RouterModule,
    FormsModule
  ],
})
export class EscanearPage {
  imagenTicket: string = '';
  cargando: boolean = false;
  productos: any[] = [];
  total: string = '';
  negocio: string = '';
  fecha: string = '';
  idTicket: number | null = null;

  constructor(
    private supabaseServicio: SupabaseServicio,
    private iaService: IAService,
    private router: Router
  ) {
    addIcons({
      walletOutline,
      homeOutline,
      scanOutline,
      barChartOutline,
      cameraOutline,
      imagesOutline,
      trashOutline,
      sparklesOutline
    });
  }

  /* =====================================
      CÁMARA
  ===================================== */
  async tomarFoto() {
    try {
      const foto = await Camera.getPhoto({
        quality: 35,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      if (foto.dataUrl) {
        this.imagenTicket = foto.dataUrl;
        this.limpiarDatosPrevios();
      }
    } catch (error) {
      // Evitamos alarmas en consola si el usuario simplemente canceló la toma de foto
      console.warn('Operación de cámara cancelada por el usuario.');
    }
  }

  /* =====================================
      GALERÍA
  ===================================== */
  async elegirImagen() {
    try {
      const foto = await Camera.getPhoto({
        quality: 35,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      if (foto.dataUrl) {
        this.imagenTicket = foto.dataUrl;
        this.limpiarDatosPrevios();
      }
    } catch (error) {
      console.warn('Selección de galería cancelada por el usuario.');
    }
  }

  /* =====================================
      ANALIZAR IA
  ===================================== */
  async analizarConIA() {
    if (!this.imagenTicket) {
      alert('Primero toma una foto o selecciona una imagen.');
      return;
    }

    this.cargando = true;

    try {
      // 1. OBTENER RESPUESTA DE LA IA
      const respuesta = await this.iaService.analizarTicket(this.imagenTicket);

      if (!respuesta) {
        alert('No se recibió ninguna respuesta de la IA.');
        this.cargando = false;
        return;
      }

      console.log('RESPUESTA IA BRUTA:', respuesta);

      // Variables temporales para recolección inteligente de datos
      let negocioDetectado = 'Ticket Detectado';
      let fechaDetectada = new Date().toISOString().substring(0, 10);
      let productosDetectados: any[] = [];
      let totalDetectado = '0';

      // 2. LIMPIAR CONTENEDORES DE CÓDIGO MD DE LA RESPUESTA
      const jsonLimpio = respuesta
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      try {
        // INTENTO A: Parsear el formato JSON estándar esperado
        const datos = JSON.parse(jsonLimpio);

        negocioDetectado = datos.negocio || datos.concepto || 'Ticket Detectado';
        fechaDetectada = datos.fecha || fechaDetectada;
        productosDetectados = Array.isArray(datos.productos) ? datos.productos : [];
        totalDetectado = datos.total ? datos.total.toString() : '0';

      } catch (errorParsing) {
        // INTENTO B (Respaldo): Si la IA falló enviando texto plano, extraemos con expresiones regulares
        console.warn('La respuesta no fue un JSON válido, usando plan de respaldo de extracción...');

        productosDetectados = respuesta.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        const matchNegocio = respuesta.match(/(?:Negocio|Establecimiento|Nombre):\s*(.*)/i);
        if (matchNegocio) negocioDetectado = matchNegocio[1].trim();

        const matchFecha = respuesta.match(/(?:Fecha|Date):\s*([\d\/|-]+)/i);
        if (matchFecha) {
          const fechaTexto = matchFecha[1].trim();
          const partes = fechaTexto.split('/');
          fechaDetectada = partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : fechaTexto;
        }

        const matchTotal = respuesta.match(/(?:Total|Monto Total|Pago):\s*([\d,.]+)/i);
        if (matchTotal) totalDetectado = matchTotal[1].replace(/,/g, '').trim();
      }

      // Asignación final segura al estado local del componente
      this.negocio = String(negocioDetectado);
      this.fecha = String(fechaDetectada);
      this.productos = productosDetectados;
      this.total = String(totalDetectado);

      console.log(
        'PRODUCTOS DETECTADOS:',
        this.productos
      );

      // =====================================
      // 3. FORMATEAR NOTAS
      // =====================================
      const notasFormateadas = this.productos.map(p => {
        if (typeof p === 'string') return `- ${p}`;
        return `- ${p.nombre || 'Producto'}: $${p.precio || 0}`;
      }).join('\n');

      // 4. REDIRECCIÓN ENVIANDO TODOS LOS DATOS RECOLECTADOS HACIA NUEVO GASTO
      this.router.navigate(['/nuevogasto'], {
        state: {
          gastoDetectado: {
            negocio: this.negocio,
            concepto: this.negocio,
            fecha: this.fecha,
            productos: this.productos,
            notas: notasFormateadas,
            total: this.total,
            monto: parseFloat(this.total) || 0,
            imagen: this.imagenTicket // Enviamos la imagen capturada por si se necesita renderizar allá
          }
        }
      });

    } catch (error) {
      console.error('Error crítico en el flujo de análisis:', error);
      alert('Ocurrió un error al analizar el ticket.');
    } finally {
      this.cargando = false;
    }
  }

  /* =====================================
      SUPABASE
  ===================================== */
  async guardarEnSupabase() {
    try {
      const { data, error } = await this.supabaseServicio.supabase
        .from('gastos')
        .insert({
          concepto: 'Ticket Escaneado',
          establecimiento: this.negocio,
          fecha_gasto: this.fecha,
          notas: JSON.stringify(this.productos),
          monto: parseFloat(this.total) || 0,
          categoria_id: 5,
          metodo_pago_id: 1,
          procesado_por_ia: true
        })
        .select();

      if (error) {
        console.error('ERROR SUPABASE:', error);
        return;
      }

      if (data && data.length > 0) {
        this.idTicket = data[0].id;
      }

      console.log('GUARDADO EN SUPABASE EXITOSO:', data);
    } catch (error) {
      console.error('ERROR GENERAL SUPABASE:', error);
    }
  }

  /* =====================================
      ELIMINAR TICKET / RESETEAR
  ===================================== */
  async eliminarTicket() {
    try {
      if (this.idTicket) {
        await this.supabaseServicio.supabase
          .from('gastos')
          .delete()
          .eq('id', this.idTicket);
      }

      this.imagenTicket = '';
      this.limpiarDatosPrevios();
    } catch (error) {
      console.error('Error al remover el registro:', error);
    }
  }

  /* =====================================
      LIMPIAR ESTADOS
  ===================================== */
  limpiarDatosPrevios() {
    this.productos = [];
    this.total = '';
    this.negocio = '';
    this.fecha = '';
    this.idTicket = null;
  }
}
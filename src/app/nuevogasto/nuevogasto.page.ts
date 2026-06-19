import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonIcon, IonInput, IonModal, IonDatetime, IonFooter, IonItem, IonLabel, IonButton, IonSelectOption, IonSelect, IonTextarea } from '@ionic/angular/standalone';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  personCircleOutline,
  homeOutline,
  walletOutline,
  scanOutline,
  barChartOutline,
  qrCodeOutline
} from 'ionicons/icons';
import { SupabaseServicio } from '../servicios/supabase.servicio';

@Component({
  selector: 'app-nuevogasto',
  templateUrl: './nuevogasto.page.html',
  styleUrls: ['./nuevogasto.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonModal,
    IonDatetime,
    IonFooter,
    IonItem,
    IonLabel,
    IonButton,
    IonSelectOption,
    IonSelect,
    IonTextarea
  ]
})

export class NuevogastoPage
  implements OnInit {

  // =====================================
  // VARIABLES
  // =====================================

  idGastoEdicion: number | null = null;

  concepto: string = '';

  monto: number | null = null;

  fecha: string = '';

  categoria: string =
    'Sin categoría';

  categorias: string[] = [
    'Comida',
    'Transporte',
    'Compras',
    'Sin categoría'
  ];

  metodoPago: string =
    'Efectivo';

  notas: string = '';

  imagenGasto: string =
    'assets/imagenes/imagenescan.png';

  cargando: boolean = false;

  // =====================================
  // CONSTRUCTOR
  // =====================================

  constructor(

    private router: Router,

    private supabaseServicio:
      SupabaseServicio

  ) {

    addIcons({

      arrowBackOutline,
      personCircleOutline,
      homeOutline,
      walletOutline,
      scanOutline,
      barChartOutline,
      qrCodeOutline

    });

  }

  // =====================================
  // INIT
  // =====================================

  ngOnInit() {

    // FECHA ACTUAL

    this.fecha =
      new Date()
        .toISOString()
        .substring(0, 10);

    // =====================================
    // DATOS DESDE ESCANEO
    // =====================================

    const navigation =
      this.router
        .getCurrentNavigation();

    if (
      navigation?.extras.state &&
      navigation.extras.state['gastoAEditar']
    ) {
      const datosEdicion = navigation.extras.state['gastoAEditar'];
      
      this.idGastoEdicion = datosEdicion.id;
      this.concepto = datosEdicion.concepto || '';
      this.monto = Number(datosEdicion.monto) || null;
      this.fecha = datosEdicion.fecha_gasto || this.fecha;
      this.categoria = datosEdicion.categoria || 'Sin categoría';
      
      if (datosEdicion.metodo_pago_id === 1) this.metodoPago = 'Efectivo';
      else if (datosEdicion.metodo_pago_id === 2) this.metodoPago = 'Tarjeta';
      else if (datosEdicion.metodo_pago_id === 3) this.metodoPago = 'Transferencia';
      
      this.notas = datosEdicion.notas || '';
    }
    else if (

      navigation?.extras.state

      &&

      navigation.extras
        .state['gastoDetectado']

    ) {

      const datos =
        navigation.extras
          .state['gastoDetectado'];

      // =====================================
      // AUTOLLENADO IA
      // =====================================

      this.concepto =
        datos.concepto || '';

      this.monto =
        Number(datos.monto) || null;

      this.fecha =
        datos.fecha || this.fecha;

      this.categoria =
        datos.categoria
        || 'Sin categoría';

      this.notas =
        datos.notas || '';

      // =====================================
      // IMAGEN
      // =====================================

      if (datos.imagen) {

        this.imagenGasto =
          datos.imagen;

      }

    }

  }

  // =====================================
  // CAMBIAR METODO
  // =====================================

  cambiarMetodo(
    metodo: string
  ) {

    this.metodoPago = metodo;

  }

  // =====================================
  // GUARDAR GASTO
  // =====================================

  async guardarGasto() {

    // =====================================
    // VALIDACIONES
    // =====================================

    if (

      !this.concepto

      ||

      this.monto === null

      ||

      this.monto <= 0

    ) {

      alert(
        'Ingresa concepto y monto válido.'
      );

      return;

    }

    this.cargando = true;

    try {

      // =====================================
      // DATOS
      // =====================================

      let categoria_id = 5;
      if (this.categoria === 'Comida') categoria_id = 1;
      else if (this.categoria === 'Transporte') categoria_id = 2;
      else if (this.categoria === 'Servicios') categoria_id = 3;
      else if (this.categoria === 'Entretenimiento') categoria_id = 4;

      let metodo_pago_id = 1;
      if (this.metodoPago === 'Tarjeta') metodo_pago_id = 2;
      else if (this.metodoPago === 'Transferencia') metodo_pago_id = 3;

      const gasto = {
        concepto: this.concepto,
        monto: Number(this.monto),
        categoria_id: categoria_id,
        metodo_pago_id: metodo_pago_id,
        fecha_gasto: this.fecha,
        notas: this.notas,
      };


      // =====================================
      // SUPABASE
      // =====================================

      let resultadoOk = false;

      if (this.idGastoEdicion) {
        resultadoOk = await this.supabaseServicio.actualizarGasto(this.idGastoEdicion, gasto);
      } else {
        const insertado = await this.supabaseServicio.guardarGasto(gasto);
        if (insertado) resultadoOk = true;
      }

      // =====================================
      // ERROR
      // =====================================

      if (!resultadoOk) {

        throw new Error(
          'No se pudo guardar'
        );

      }

      // =====================================
      // EXITO
      // =====================================

      alert(
        'Gasto guardado correctamente'
      );

      // =====================================
      // LIMPIAR
      // =====================================

      this.limpiarFormulario();

      // =====================================
      // IR A GASTOS
      // =====================================

      this.router.navigate([
        '/gastos'
      ]);

    } catch (error) {

      console.error(
        'ERROR GUARDAR:',
        error
      );

      alert(
        'Error al guardar gasto'
      );

    } finally {

      this.cargando = false;

    }

  }

  // =====================================
  // LIMPIAR
  // =====================================

  limpiarFormulario() {

    this.concepto = '';

    this.monto = null;

    this.fecha =
      new Date()
        .toISOString()
        .substring(0, 10);

    this.categoria =
      'Sin categoría';

    this.metodoPago =
      'Efectivo';

    this.notas = '';

    this.imagenGasto =
      'assets/imagenes/gasto.jpg';

  }

  agregarCategoria() {

    const nuevaCategoria =
      prompt('Nombre de la nueva categoría');

    if (
      nuevaCategoria &&
      nuevaCategoria.trim() !== ''
    ) {

      const categoriaLimpia =
        nuevaCategoria.trim();

      if (
        !this.categorias.includes(
          categoriaLimpia
        )
      ) {

        this.categorias.push(
          categoriaLimpia
        );

      }

      this.categoria =
        categoriaLimpia;

    }

  }
  
  // =====================================
  // CANCELAR
  // =====================================

  cancelar() {

    this.router.navigate([
      '/home'
    ]);

  }

}
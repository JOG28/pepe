import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonFooter
} from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  home,
  scanOutline,
  barChartOutline,
  chatbubblesOutline,
  arrowBackOutline,
  bulbOutline,
  trendingDownOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  sendOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  cashOutline,
  flagOutline,
  chevronForwardOutline,
  chevronBackOutline,
  lockClosedOutline,
  settingsOutline,
  addCircleOutline,
  ribbonOutline,
  analyticsOutline,
  trophyOutline,
  chatbubbleEllipsesOutline,
  addOutline,
  trashOutline,
  timeOutline
} from 'ionicons/icons';
import { SupabaseServicio } from '../servicios/supabase.servicio';
import { AsesorIAService, MensajeChat } from '../servicios/asesor-ia.service';
import { WhapiService } from '../servicios/whapi.service';

// =====================================
// INTERFACES
// =====================================

interface Ingreso {
  nombre: string;
  tipo: string;
  monto: number | null;
  frecuencia: string;
}

interface Meta {
  titulo: string;
  descripcion: string;
  montoObjetivo: number | null;
  fechaLimite: string;
}

interface PerfilFinanciero {
  onboardingCompletado: boolean;
  ingresos: Ingreso[];
  metas: Meta[];
}

interface MensajeChatUI {
  tipo: 'asesor' | 'usuario';
  texto: string;
  fecha?: Date;
}

interface Conversacion {
  id: string;
  titulo: string;
  fecha_creacion: string;
  ultima_actualizacion: string;
}

@Component({
  selector: 'app-asesor',
  templateUrl: './asesor.page.html',
  styleUrls: ['./asesor.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    IonFooter,
    CommonModule,
    RouterModule,
    FormsModule
  ],
})
export class AsesorPage {

  // =====================================
  // CONSTANTES
  // =====================================

  readonly STORAGE_KEY = 'gastofacil_perfil_financiero';

  readonly TIPOS_INGRESO = [
    'Salario',
    'Freelance',
    'Negocio',
    'Inversiones',
    'Pensión',
    'Otro'
  ];

  readonly FRECUENCIAS = [
    'Semanal',
    'Quincenal',
    'Mensual',
    'Anual'
  ];

  // =====================================
  // ESTADO DE VISTA
  // =====================================

  vista: 'onboarding' | 'wizard' | 'main' | 'chat' = 'onboarding';

  // =====================================
  // WIZARD
  // =====================================

  pasoActual: number = 1;
  totalPasos: number = 2;

  quiereIngresos: boolean | null = null;
  quiereMetas: boolean | null = null;

  nuevoIngreso: Ingreso = {
    nombre: '',
    tipo: '',
    monto: null,
    frecuencia: ''
  };

  nuevaMeta: Meta = {
    titulo: '',
    descripcion: '',
    montoObjetivo: null,
    fechaLimite: ''
  };

  // =====================================
  // DATOS PERSISTIDOS
  // =====================================

  perfil: PerfilFinanciero = {
    onboardingCompletado: false,
    ingresos: [],
    metas: []
  };

  // =====================================
  // CONSEJOS (adaptables)
  // =====================================

  consejos: any[] = [];

  // =====================================
  // CHAT
  // =====================================

  mensajesChat: MensajeChatUI[] = [];
  mensajeInput: string = '';
  cargandoRespuesta: boolean = false;
  conversacionActual: Conversacion | null = null;
  listaConversaciones: Conversacion[] = [];
  historialIA: MensajeChat[] = [];

  @ViewChild('chatMessagesContainer') chatMessagesContainer!: ElementRef;
  @ViewChild(IonContent) ionContent!: IonContent;

  constructor(
    private router: Router,
    private supabase: SupabaseServicio,
    private asesorIA: AsesorIAService,
    private whapi: WhapiService
  ) {
    addIcons({
      walletOutline,
      home,
      scanOutline,
      barChartOutline,
      chatbubblesOutline,
      arrowBackOutline,
      bulbOutline,
      trendingDownOutline,
      shieldCheckmarkOutline,
      sparklesOutline,
      sendOutline,
      closeCircleOutline,
      checkmarkCircleOutline,
      cashOutline,
      flagOutline,
      chevronForwardOutline,
      chevronBackOutline,
      lockClosedOutline,
      settingsOutline,
      addCircleOutline,
      ribbonOutline,
      analyticsOutline,
      trophyOutline,
      chatbubbleEllipsesOutline,
      addOutline,
      trashOutline,
      timeOutline
    });
  }

  // =====================================
  // LIFECYCLE
  // =====================================

  async ionViewWillEnter() {
    await this.cargarDatos();

    if (this.perfil.onboardingCompletado) {
      this.vista = 'main';
      this.generarConsejos();
      await this.generarMensajeChat();
      await this.cargarConversaciones();
    } else {
      this.vista = 'onboarding';
    }
  }

  // =====================================
  // PERSISTENCIA (localStorage y Supabase)
  // =====================================

  async cargarDatos() {
    if (this.supabase.estaLogueado()) {
      try {
        const ingresosDB = await this.supabase.obtenerIngresos();
        const metasDB = await this.supabase.obtenerMetas();

        this.perfil.ingresos = ingresosDB.map(i => ({
          nombre: i.nombre,
          tipo: i.tipo,
          monto: Number(i.monto),
          frecuencia: i.frecuencia
        }));

        this.perfil.metas = metasDB.map(m => ({
          titulo: m.titulo,
          descripcion: m.descripcion || '',
          montoObjetivo: Number(m.monto_objetivo),
          fechaLimite: m.fecha_limite || ''
        }));

        const complLocal = localStorage.getItem(this.STORAGE_KEY + '_completado') === 'true';
        this.perfil.onboardingCompletado = complLocal || this.perfil.ingresos.length > 0 || this.perfil.metas.length > 0;
      } catch (error) {
        console.error('Error al cargar datos desde Supabase:', error);
      }
    } else {
      // Fallback local
      const datos = localStorage.getItem(this.STORAGE_KEY);
      if (datos) {
        try {
          this.perfil = JSON.parse(datos);
        } catch {
          this.perfil = {
            onboardingCompletado: false,
            ingresos: [],
            metas: []
          };
        }
      }
    }
  }

  async guardarDatos() {
    if (this.supabase.estaLogueado()) {
      localStorage.setItem(this.STORAGE_KEY + '_completado', this.perfil.onboardingCompletado ? 'true' : 'false');
    } else {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.perfil)
      );
    }
  }

  // =====================================
  // ONBOARDING ACTIONS
  // =====================================

  iniciarConfiguracion() {
    this.vista = 'wizard';
    this.pasoActual = 1;
    this.quiereIngresos = null;
    this.quiereMetas = null;
    this.resetearFormularios();
  }

  async omitirOnboarding() {
    this.perfil.onboardingCompletado = true;
    await this.guardarDatos();
    this.vista = 'main';
    this.generarConsejos();
    await this.generarMensajeChat();
    await this.cargarConversaciones();
  }

  // =====================================
  // WIZARD NAVIGATION
  // =====================================

  async siguientePaso() {
    // Guardar datos del paso actual
    if (this.pasoActual === 1 && this.quiereIngresos && this.validarIngreso()) {
      const ingreso = { ...this.nuevoIngreso };
      this.perfil.ingresos = [ingreso];
      if (this.supabase.estaLogueado()) {
        await this.supabase.guardarIngreso(ingreso);
      }
    }

    if (this.pasoActual < this.totalPasos) {
      this.pasoActual++;
    } else {
      await this.finalizarWizard();
    }
  }

  pasoAnterior() {
    if (this.pasoActual > 1) {
      this.pasoActual--;
    } else {
      // Si viene de reconfigurar, volver a main; si es primera vez, volver a onboarding
      if (localStorage.getItem(this.STORAGE_KEY + '_completado') === 'true' ||
          localStorage.getItem(this.STORAGE_KEY)) {
        this.perfil.onboardingCompletado = true;
        this.vista = 'main';
        this.generarConsejos();
      } else {
        this.vista = 'onboarding';
      }
    }
  }

  async finalizarWizard() {
    // Guardar meta si quiere
    if (this.quiereMetas && this.validarMeta()) {
      const meta = { ...this.nuevaMeta };
      this.perfil.metas = [meta];
      if (this.supabase.estaLogueado()) {
        const metaParaDB = {
          titulo: meta.titulo,
          descripcion: meta.descripcion,
          monto_objetivo: meta.montoObjetivo,
          fecha_limite: meta.fechaLimite || null
        };
        await this.supabase.guardarMeta(metaParaDB);
      }
    }

    this.perfil.onboardingCompletado = true;
    await this.guardarDatos();
    this.vista = 'main';
    this.generarConsejos();
    await this.generarMensajeChat();
    await this.cargarConversaciones();
  }

  puedeAvanzar(): boolean {
    if (this.pasoActual === 1) {
      if (this.quiereIngresos === null) return false;
      if (this.quiereIngresos === false) return true;
      return this.validarIngreso();
    }
    if (this.pasoActual === 2) {
      if (this.quiereMetas === null) return false;
      if (this.quiereMetas === false) return true;
      return this.validarMeta();
    }
    return false;
  }

  // =====================================
  // VALIDACIONES
  // =====================================

  validarIngreso(): boolean {
    return !!(
      this.nuevoIngreso.nombre.trim() &&
      this.nuevoIngreso.tipo &&
      this.nuevoIngreso.monto &&
      this.nuevoIngreso.monto > 0 &&
      this.nuevoIngreso.frecuencia
    );
  }

  validarMeta(): boolean {
    return !!(
      this.nuevaMeta.titulo.trim() &&
      this.nuevaMeta.montoObjetivo &&
      this.nuevaMeta.montoObjetivo > 0
    );
  }

  resetearFormularios() {
    this.nuevoIngreso = {
      nombre: '',
      tipo: '',
      monto: null,
      frecuencia: ''
    };
    this.nuevaMeta = {
      titulo: '',
      descripcion: '',
      montoObjetivo: null,
      fechaLimite: ''
    };
  }

  // =====================================
  // NIVEL DE PERSONALIZACIÓN
  // =====================================

  tieneGastos(): boolean {
    return true;
  }

  tieneIngresos(): boolean {
    return this.perfil.ingresos.length > 0;
  }

  tieneMetas(): boolean {
    return this.perfil.metas.length > 0;
  }

  nivelPersonalizacion(): number {
    let nivel = 1;
    if (this.tieneIngresos()) nivel++;
    if (this.tieneMetas()) nivel++;
    return nivel;
  }

  porcentajePersonalizacion(): number {
    return Math.round((this.nivelPersonalizacion() / 3) * 100);
  }

  // =====================================
  // CONSEJOS ADAPTATIVOS
  // =====================================

  generarConsejos() {
    this.consejos = [];

    // Consejos base (siempre)
    this.consejos.push({
      icono: 'trending-down-outline',
      titulo: 'Reduce gastos hormiga',
      descripcion: 'Los cafés y snacks diarios suman más de lo que crees. Intenta llevar tu propio café al trabajo.',
      color: '#e14134'
    });

    if (this.tieneIngresos()) {
      const ingreso = this.perfil.ingresos[0];
      this.consejos.push({
        icono: 'analytics-outline',
        titulo: 'Análisis de tu ingreso',
        descripcion: `Con tu ingreso de $${this.formatoMoneda(ingreso.monto || 0)} ${ingreso.frecuencia.toLowerCase()}, te recomendamos destinar máximo el 50% a necesidades básicas.`,
        color: '#0057d9'
      });
    } else {
      this.consejos.push({
        icono: 'bulb-outline',
        titulo: 'Regla 50/30/20',
        descripcion: '50% necesidades, 30% deseos, 20% ahorro. Registra tus ingresos para ver recomendaciones personalizadas.',
        color: '#0057d9'
      });
    }

    if (this.tieneMetas()) {
      const meta = this.perfil.metas[0];
      this.consejos.push({
        icono: 'trophy-outline',
        titulo: `Meta: ${meta.titulo}`,
        descripcion: `Tu objetivo es $${this.formatoMoneda(meta.montoObjetivo || 0)}. ${meta.fechaLimite ? 'Fecha límite: ' + meta.fechaLimite + '.' : ''} ¡Sigue adelante!`,
        color: '#009245'
      });
    } else {
      this.consejos.push({
        icono: 'shield-checkmark-outline',
        titulo: 'Fondo de emergencia',
        descripcion: 'Ahorra al menos 3 meses de gastos fijos. Registra una meta para hacer seguimiento.',
        color: '#009245'
      });
    }

    this.consejos.push({
      icono: 'sparkles-outline',
      titulo: 'Revisa suscripciones',
      descripcion: 'Cancela las suscripciones que no uses. Podrías ahorrar hasta $500 al mes sin darte cuenta.',
      color: '#f59e0b'
    });
  }

  // =====================================
  // CHAT ADAPTATIVO (MENSAJE INICIAL)
  // =====================================

  async generarMensajeChat() {
    this.mensajesChat = [];

    if (this.supabase.estaLogueado()) {
      try {
        const resumen = await this.supabase.obtenerResumenFinanciero();
        if (resumen) {
          let texto = '¡Hola! He analizado tu perfil financiero actual. ';

          if (this.tieneIngresos()) {
            const ingresosTotales = resumen.ingresos.reduce((acc: number, val: any) => acc + Number(val.monto), 0);
            const totalMes = Number(resumen.total_mes);
            
            if (ingresosTotales > 0) {
              const porcentajeGasto = Math.round((totalMes / ingresosTotales) * 100);
              texto += `Este mes has gastado un total de $${this.formatoMoneda(totalMes)}, lo que equivale al ${porcentajeGasto}% de tus ingresos mensuales registrados ($${this.formatoMoneda(ingresosTotales)}). `;
              
              if (porcentajeGasto > 80) {
                texto += '⚠️ Tus gastos están muy cerca de tus ingresos. Te recomiendo recortar gastos no esenciales lo antes posible.';
              } else if (porcentajeGasto > 50) {
                texto += 'Tu nivel de gasto es moderado, pero puedes optimizar tus finanzas ahorrando un poco más.';
              } else {
                texto += '🎉 ¡Excelente! Estás manteniendo tus gastos por debajo del 50% de tus ingresos, lo cual es muy saludable.';
              }
            }
          } else {
            texto += `Este mes llevas gastado $${this.formatoMoneda(Number(resumen.total_mes))}. Si registras tus ingresos, podré decirte si tu ritmo de gasto actual es sostenible. `;
          }

          if (this.tieneMetas() && resumen.metas.length > 0) {
            const meta = resumen.metas[0];
            const objetivo = Number(meta.monto_objetivo);
            const actual = Number(meta.monto_actual || 0);
            if (objetivo > 0) {
              const progreso = Math.round((actual / objetivo) * 100);
              texto += ` Respecto a tu meta "${meta.titulo}", llevas un progreso del ${progreso}% ($${this.formatoMoneda(actual)} de $${this.formatoMoneda(objetivo)}).`;
            }
          }

          this.mensajesChat.push({
            tipo: 'asesor',
            texto: texto
          });
          return;
        }
      } catch (error) {
        console.error('Error al obtener el resumen financiero para el chat:', error);
      }
    }

    // Fallback local/offline
    if (this.tieneIngresos() && this.tieneMetas()) {
      this.mensajesChat.push({
        tipo: 'asesor',
        texto: '¡Excelente! Tienes registrados tus ingresos y metas financieras. Puedo darte recomendaciones personalizadas sobre qué porcentaje de tu ingreso estás gastando, cuánto podrías ahorrar y si vas por buen camino para alcanzar tus objetivos.'
      });
    } else if (this.tieneIngresos()) {
      this.mensajesChat.push({
        tipo: 'asesor',
        texto: 'He analizado tus gastos y conozco tus ingresos. Puedo decirte qué porcentaje de tu ingreso estás gastando y cuánto podrías ahorrar. Si registras una meta financiera, también podré orientarte para alcanzarla.'
      });
    } else if (this.tieneMetas()) {
      this.mensajesChat.push({
        tipo: 'asesor',
        texto: 'He analizado tus gastos y conozco tu meta financiera. Si registras tus ingresos, podré decirte si tus gastos son sostenibles y cuánto necesitas ahorrar para alcanzar tu objetivo.'
      });
    } else {
      this.mensajesChat.push({
        tipo: 'asesor',
        texto: 'He analizado tus gastos. Si en algún momento registras tus ingresos o metas financieras, podré darte recomendaciones más personalizadas, como cuánto ahorrar al mes o si vas por buen camino para alcanzar un objetivo.'
      });
    }
  }

  // =====================================
  // CHAT CON IA - CONVERSACIONES
  // =====================================

  async cargarConversaciones() {
    if (this.supabase.estaLogueado()) {
      this.listaConversaciones = await this.supabase.obtenerConversaciones();
    }
  }

  async abrirChat() {
    if (!this.supabase.estaLogueado()) {
      // Sin login: chat temporal sin persistencia
      this.conversacionActual = null;
      this.mensajesChat = [{
        tipo: 'asesor',
        texto: '¡Hola! 👋 Soy Pepe, tu asesor financiero personal. ¿En qué puedo ayudarte hoy? Puedo analizar tus gastos, darte consejos de ahorro o ayudarte a planificar tus finanzas.',
        fecha: new Date()
      }];
      this.historialIA = [];
      this.vista = 'chat';
      setTimeout(() => this.scrollAlFinal(), 100);
      return;
    }

    // Con login: crear nueva conversación
    await this.nuevaConversacion();
  }

  async nuevaConversacion() {
    const conv = await this.supabase.crearConversacion('Nueva conversación');
    if (conv) {
      this.conversacionActual = conv;
      this.mensajesChat = [{
        tipo: 'asesor',
        texto: '¡Hola! 👋 Soy Pepe, tu asesor financiero personal. ¿En qué puedo ayudarte hoy? Puedo analizar tus gastos, darte consejos de ahorro o ayudarte a planificar tus finanzas.',
        fecha: new Date()
      }];
      this.historialIA = [];
      this.vista = 'chat';

      // Guardar mensaje de bienvenida
      await this.supabase.guardarMensaje(conv.id, 'ia', this.mensajesChat[0].texto);
      
      // Actualizar lista
      await this.cargarConversaciones();

      setTimeout(() => this.scrollAlFinal(), 100);
    }
  }

  async cargarConversacion(conv: Conversacion) {
    this.conversacionActual = conv;
    this.mensajesChat = [];
    this.historialIA = [];

    const mensajesDB = await this.supabase.obtenerMensajes(conv.id);

    for (const msg of mensajesDB) {
      this.mensajesChat.push({
        tipo: msg.remitente === 'usuario' ? 'usuario' : 'asesor',
        texto: msg.mensaje,
        fecha: new Date(msg.fecha)
      });

      // Reconstruir historial para la IA
      this.historialIA.push({
        role: msg.remitente === 'usuario' ? 'user' : 'assistant',
        content: msg.mensaje
      });
    }

    this.vista = 'chat';
    setTimeout(() => this.scrollAlFinal(), 100);
  }

  async eliminarConversacionChat(conv: Conversacion, event: Event) {
    event.stopPropagation();
    
    const confirmado = confirm('¿Eliminar esta conversación?');
    if (!confirmado) return;

    const exito = await this.supabase.eliminarConversacion(conv.id);
    if (exito) {
      this.listaConversaciones = this.listaConversaciones.filter(c => c.id !== conv.id);
    }
  }

  // =====================================
  // CHAT CON IA - ENVIAR MENSAJE
  // =====================================

  async enviarMensaje() {
    const texto = this.mensajeInput.trim();
    if (!texto || this.cargandoRespuesta) return;

    // Agregar mensaje del usuario a la UI
    this.mensajesChat.push({
      tipo: 'usuario',
      texto: texto,
      fecha: new Date()
    });

    this.mensajeInput = '';
    this.cargandoRespuesta = true;

    setTimeout(() => this.scrollAlFinal(), 50);

    // Guardar mensaje del usuario en Supabase
    if (this.conversacionActual) {
      await this.supabase.guardarMensaje(this.conversacionActual.id, 'usuario', texto);
    }

    // Obtener contexto financiero
    let contexto = null;
    if (this.supabase.estaLogueado()) {
      try {
        const [ingresosDB, metasDB, totalMes, gastosRecientes] = await Promise.all([
          this.supabase.obtenerIngresos(),
          this.supabase.obtenerMetas(),
          this.supabase.obtenerTotalMes(),
          this.supabase.obtenerGastosRecientes()
        ]);

        contexto = {
          ingresos: ingresosDB,
          metas: metasDB,
          totalGastosMes: totalMes,
          gastosRecientes: gastosRecientes
        };
      } catch (error) {
        console.error('Error al obtener contexto financiero:', error);
      }
    }

    let tieneWhatsApp = false;
    let telefonoUsuario = '';
    
    if (this.supabase.estaLogueado()) {
      telefonoUsuario = this.supabase.obtenerTelefonoUsuario();
      tieneWhatsApp = !!telefonoUsuario;
    }

    console.log('DEBUG ASESOR: Telefono de usuario:', telefonoUsuario, '| Tiene WhatsApp:', tieneWhatsApp);

    try {
      // Enviar a la IA
      const respuestaIA = await this.asesorIA.enviarMensaje(
        this.historialIA,
        texto,
        contexto,
        tieneWhatsApp
      );

      // Parsear si hay un recordatorio para WhatsApp
      let respuestaLimpia = respuestaIA;
      console.log('DEBUG ASESOR: Respuesta bruta de IA:', respuestaIA);
      
      const recordatorio = this.asesorIA.parsearRecordatorio(respuestaIA);
      console.log('DEBUG ASESOR: Objeto recordatorio parseado:', recordatorio);
      
      if (recordatorio) {
        respuestaLimpia = recordatorio.textoLimpio;
        
        // Manejar recordatorio por WhatsApp
        if (tieneWhatsApp) {
          if (recordatorio.fecha) {
            // Guardar en la base de datos para envío futuro
            this.supabase.guardarRecordatorioProgramado(
              telefonoUsuario, 
              recordatorio.tipo, 
              recordatorio.detalle,
              recordatorio.fecha
            ).then((exito: boolean) => {
              if (exito) console.log('Recordatorio programado guardado exitosamente');
            });
          } else {
            // Enviar inmediatamente si por alguna razón no hay fecha
            this.whapi.enviarRecordatorio(
              telefonoUsuario, 
              recordatorio.tipo, 
              recordatorio.detalle
            ).then((exito: boolean) => {
              if (exito) console.log('Recordatorio enviado por WhatsApp exitosamente');
            });
          }
        }
      }

      // Actualizar historial de la IA con la respuesta completa (para mantener contexto)
      this.historialIA.push({ role: 'user', content: texto });
      this.historialIA.push({ role: 'assistant', content: respuestaIA });

      // Limitar historial a los últimos 20 mensajes para no exceder tokens
      if (this.historialIA.length > 20) {
        this.historialIA = this.historialIA.slice(-20);
      }

      // Agregar respuesta LIMPIA a la UI (sin el bloque JSON)
      this.mensajesChat.push({
        tipo: 'asesor',
        texto: respuestaLimpia,
        fecha: new Date()
      });

      // Guardar respuesta LIMPIA en Supabase
      if (this.conversacionActual) {
        await this.supabase.guardarMensaje(this.conversacionActual.id, 'ia', respuestaLimpia);

        // Generar título automático después del primer mensaje del usuario
        if (this.mensajesChat.filter(m => m.tipo === 'usuario').length === 1) {
          const titulo = await this.asesorIA.generarTitulo(texto);
          await this.supabase.actualizarConversacion(this.conversacionActual.id, titulo);
          this.conversacionActual.titulo = titulo;
          await this.cargarConversaciones();
        }
      }

    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      this.mensajesChat.push({
        tipo: 'asesor',
        texto: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo. 😔',
        fecha: new Date()
      });
    }

    this.cargandoRespuesta = false;
    setTimeout(() => this.scrollAlFinal(), 50);
  }

  // =====================================
  // CHAT - UTILIDADES
  // =====================================

  scrollAlFinal() {
    if (this.ionContent) {
      this.ionContent.scrollToBottom(300);
    }
  }

  volverDeChat() {
    this.vista = 'main';
    this.mensajeInput = '';
    this.cargandoRespuesta = false;
    this.generarMensajeChat();
    this.cargarConversaciones();
  }

  formatoFechaConversacion(fecha: string): string {
    const d = new Date(fecha);
    const ahora = new Date();
    const diff = ahora.getTime() - d.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias < 7) return `Hace ${dias}d`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  onChatKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarMensaje();
    }
  }

  // =====================================
  // RECONFIGURAR (desde vista main)
  // =====================================

  async reconfigurar() {
    this.perfil.onboardingCompletado = false;
    this.perfil.ingresos = [];
    this.perfil.metas = [];

    if (this.supabase.estaLogueado()) {
      try {
        localStorage.setItem(this.STORAGE_KEY + '_completado', 'false');
        
        // Limpiamos los datos del usuario en la base de datos para que inicie la configuración de nuevo
        const ingresosDB = await this.supabase.obtenerIngresos();
        for (const i of ingresosDB) {
          await this.supabase.eliminarIngreso(i.id);
        }
        
        const metasDB = await this.supabase.obtenerMetas();
        for (const m of metasDB) {
          await this.supabase.eliminarMeta(m.id);
        }
      } catch (error) {
        console.error('Error al resetear datos en Supabase:', error);
      }
    } else {
      await this.guardarDatos();
    }

    // Ir directo al wizard (pantalla de datos) sin pasar por el onboarding
    this.vista = 'wizard';
    this.pasoActual = 1;
    this.quiereIngresos = null;
    this.quiereMetas = null;
    this.resetearFormularios();
  }

  // =====================================
  // UTILIDADES
  // =====================================

  volver() {
    this.router.navigate(['/home']);
  }

  formatoMoneda(valor: number): string {
    return valor.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

}

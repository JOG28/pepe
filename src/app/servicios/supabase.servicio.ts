import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseServicio {

  // =====================================
  // CLIENTE SUPABASE (público para uso directo)
  // =====================================

  supabase: SupabaseClient;
  currentUser: User | null = null;
  deviceId: string = '';
  private sessionReady: Promise<void>;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    // Generar deviceId de forma síncrona inmediatamente
    this.obtenerOGenerarDeviceId();
    
    // Iniciar el proceso de sesión y guardar la promesa
    this.sessionReady = this.inicializarSesion();
  }

  // =====================================
  // MANEJO DE SESIÓN Y DISPOSITIVO
  // =====================================

  async inicializarSesion() {
    // 1. Obtener usuario si está logueado (esto es asíncrono)
    const { data: { session } } = await this.supabase.auth.getSession();
    this.currentUser = session?.user || null;

    // 2. Escuchar cambios de autenticación
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      this.currentUser = session?.user || null;
      if (event === 'SIGNED_IN' && this.currentUser) {
        // Al iniciar sesión, migrar datos del device_id al user_id
        await this.migrarDatosAlPerfil();
      } else if (event === 'SIGNED_OUT') {
        // Al cerrar sesión, generar nuevo device_id
        this.obtenerOGenerarDeviceId();
      }
    });
  }

  private obtenerOGenerarDeviceId() {
    let id = localStorage.getItem('gasto_device_id');
    if (!id) {
      id = 'device-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('gasto_device_id', id);
    }
    this.deviceId = id;
  }

  private async migrarDatosAlPerfil() {
    if (!this.currentUser) return;
    const oldDeviceId = localStorage.getItem('gasto_device_id');
    
    if (oldDeviceId) {
      // Actualizamos todos los gastos que tenían el device_id viejo para que tengan el user_id
      const { error } = await this.supabase
        .from('gastos')
        .update({ user_id: this.currentUser.id, device_id: null })
        .eq('device_id', oldDeviceId);
        
      if (!error) {
        // Borramos el device_id porque ya se migró todo
        localStorage.removeItem('gasto_device_id');
        this.deviceId = '';
      }
    }
  }

  // =====================================
  // AUTENTICACIÓN
  // =====================================

  async registrarse(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  async iniciarSesion(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async cerrarSesion() {
    return await this.supabase.auth.signOut();
  }

  // Método usado por login.page.ts (con nombre)
  async registrar(email: string, password: string, nombre: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre }
      }
    });
    if (error) throw error;
    return data;
  }

  async obtenerUsuario() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  async restablecerPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/home'
    });
    if (error) throw error;
  }

  // =====================================
  // OBTENER GASTOS RECIENTES (últimos 5)
  // =====================================

  async obtenerGastosRecientes(): Promise<any[]> {
    await this.sessionReady; // ESPERAR a que se cargue la sesión

    let query = this.supabase
      .from('gastos')
      .select('*')
      .order('fecha_creacion', { ascending: false })
      .limit(5);

    if (this.currentUser) {
      query = query.eq('user_id', this.currentUser.id);
    } else {
      query = query.eq('device_id', this.deviceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener gastos recientes:', error);
      return [];
    }

    return data || [];
  }

  // =====================================
  // OBTENER TOTAL DEL MES ACTUAL
  // =====================================

  async obtenerTotalMes(): Promise<number> {
    await this.sessionReady; // ESPERAR a que se cargue la sesión

    const ahora = new Date();
    const primerDia = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      1
    ).toISOString().substring(0, 10);

    const ultimoDia = new Date(
      ahora.getFullYear(),
      ahora.getMonth() + 1,
      0
    ).toISOString().substring(0, 10);

    let query = this.supabase
      .from('gastos')
      .select('monto')
      .gte('fecha_gasto', primerDia)
      .lte('fecha_gasto', ultimoDia);

    if (this.currentUser) {
      query = query.eq('user_id', this.currentUser.id);
    } else {
      query = query.eq('device_id', this.deviceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener total del mes:', error);
      return 0;
    }

    if (!data || data.length === 0) return 0;

    return data.reduce(
      (acc: number, gasto: any) => acc + Number(gasto.monto),
      0
    );
  }

  // =====================================
  // OBTENER TODOS LOS GASTOS
  // =====================================

  async obtenerGastos(): Promise<any[]> {
    await this.sessionReady; // ESPERAR a que se cargue la sesión

    let query = this.supabase
      .from('gastos')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (this.currentUser) {
      query = query.eq('user_id', this.currentUser.id);
    } else {
      query = query.eq('device_id', this.deviceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener gastos:', error);
      return [];
    }

    return data || [];
  }

  // =====================================
  // GUARDAR GASTO
  // =====================================

  async guardarGasto(gasto: any): Promise<any> {
    await this.sessionReady; // ESPERAR a que se cargue la sesión

    const gastoAInsertar = { ...gasto };
    if (this.currentUser) {
      gastoAInsertar.user_id = this.currentUser.id;
    } else {
      gastoAInsertar.device_id = this.deviceId;
    }

    const { data, error } = await this.supabase
      .from('gastos')
      .insert(gastoAInsertar)
      .select();

    if (error) {
      console.error('Error al guardar gasto:', error);
      return null;
    }

    return data;
  }

  // =====================================
  // ACTUALIZAR GASTO
  // =====================================

  async actualizarGasto(id: number, gasto: any): Promise<boolean> {
    const { error } = await this.supabase
      .from('gastos')
      .update(gasto)
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar gasto:', error);
      return false;
    }

    return true;
  }

  // =====================================
  // ELIMINAR GASTO
  // =====================================

  async eliminarGasto(id: number): Promise<boolean> {
    const { error } = await this.supabase
      .from('gastos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar gasto:', error);
      return false;
    }

    return true;
  }

  // =====================================
  // PERFIL DE USUARIO
  // =====================================

  async actualizarPerfil(datos: { nombre?: string; email?: string }): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) {
      return { success: false, error: 'No hay sesión activa.' };
    }

    try {
      // Actualizar metadatos del usuario (nombre)
      if (datos.nombre !== undefined) {
        const { error } = await this.supabase.auth.updateUser({
          data: { nombre: datos.nombre }
        });
        if (error) return { success: false, error: error.message };
      }

      // Actualizar correo electrónico
      if (datos.email && datos.email !== this.currentUser.email) {
        const { error } = await this.supabase.auth.updateUser({
          email: datos.email
        });
        if (error) return { success: false, error: error.message };
        return { success: true, error: 'Se envió un correo de confirmación a tu nueva dirección.' };
      }

      // Refrescar datos del usuario
      const { data: { user } } = await this.supabase.auth.getUser();
      this.currentUser = user;

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error desconocido.' };
    }
  }

  obtenerNombreUsuario(): string {
    if (!this.currentUser) return '';
    return this.currentUser.user_metadata?.['nombre'] || '';
  }

  estaLogueado(): boolean {
    return !!this.currentUser;
  }

  // =====================================
  // INGRESOS
  // =====================================

  async obtenerIngresos(): Promise<any[]> {
    await this.sessionReady;
    if (!this.currentUser) return [];

    const { data, error } = await this.supabase
      .from('ingresos')
      .select('*')
      .eq('user_id', this.currentUser.id)
      .eq('activo', true)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error al obtener ingresos:', error);
      return [];
    }
    return data || [];
  }

  async guardarIngreso(ingreso: any): Promise<any> {
    await this.sessionReady;
    if (!this.currentUser) return null;

    const ingresoAInsertar = {
      ...ingreso,
      user_id: this.currentUser.id
    };

    const { data, error } = await this.supabase
      .from('ingresos')
      .insert(ingresoAInsertar)
      .select();

    if (error) {
      console.error('Error al guardar ingreso:', error);
      return null;
    }
    return data;
  }

  async eliminarIngreso(id: string): Promise<boolean> {
    await this.sessionReady;
    const { error } = await this.supabase
      .from('ingresos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar ingreso:', error);
      return false;
    }
    return true;
  }

  // =====================================
  // METAS
  // =====================================

  async obtenerMetas(): Promise<any[]> {
    await this.sessionReady;
    if (!this.currentUser) return [];

    const { data, error } = await this.supabase
      .from('metas')
      .select('*')
      .eq('user_id', this.currentUser.id)
      .eq('estado', 'activa')
      .order('prioridad', { ascending: true });

    if (error) {
      console.error('Error al obtener metas:', error);
      return [];
    }
    return data || [];
  }

  async guardarMeta(meta: any): Promise<any> {
    await this.sessionReady;
    if (!this.currentUser) return null;

    const metaAInsertar = {
      ...meta,
      user_id: this.currentUser.id
    };

    const { data, error } = await this.supabase
      .from('metas')
      .insert(metaAInsertar)
      .select();

    if (error) {
      console.error('Error al guardar meta:', error);
      return null;
    }
    return data;
  }

  async eliminarMeta(id: string): Promise<boolean> {
    await this.sessionReady;
    const { error } = await this.supabase
      .from('metas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar meta:', error);
      return false;
    }
    return true;
  }

  // =====================================
  // RPC RESUMEN FINANCIERO
  // =====================================

  async obtenerResumenFinanciero(): Promise<any> {
    await this.sessionReady;
    if (!this.currentUser) return null;

    const { data, error } = await this.supabase.rpc('obtener_resumen_financiero');

    if (error) {
      console.error('Error al llamar obtener_resumen_financiero:', error);
      return null;
    }
    return data;
  }

}

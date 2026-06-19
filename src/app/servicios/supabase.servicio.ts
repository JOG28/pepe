import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseServicio {

  // =====================================
  // CLIENTE SUPABASE (público para uso directo)
  // =====================================

  supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // =====================================
  // OBTENER GASTOS RECIENTES (últimos 5)
  // =====================================

  async obtenerGastosRecientes(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('gastos')
      .select('*')
      .order('fecha_creacion', { ascending: false })
      .limit(5);

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

    const { data, error } = await this.supabase
      .from('gastos')
      .select('monto')
      .gte('fecha_gasto', primerDia)
      .lte('fecha_gasto', ultimoDia);

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
    const { data, error } = await this.supabase
      .from('gastos')
      .select('*')
      .order('fecha_creacion', { ascending: false });

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
    const { data, error } = await this.supabase
      .from('gastos')
      .insert(gasto)
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

}

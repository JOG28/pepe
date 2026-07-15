import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

// Configuración del entorno
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const WHAPI_API_KEY = Deno.env.get('WHAPI_API_KEY') || ''; // ¡Agrega este secreto en Supabase!

serve(async (req) => {
  try {
    // 1. Inicializar Supabase con Service Role (para tener acceso total a la DB ignorando RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Obtener recordatorios pendientes cuya fecha programada ya pasó o es ahora
    const { data: recordatorios, error: dbError } = await supabase
      .from('recordatorios_whatsapp')
      .select('*')
      .eq('estado', 'pendiente')
      .lte('fecha_programada', new Date().toISOString());

    if (dbError) throw dbError;

    if (!recordatorios || recordatorios.length === 0) {
      return new Response(JSON.stringify({ message: "No hay recordatorios pendientes." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Procesando ${recordatorios.length} recordatorios pendientes...`);
    const resultados = [];

    // 3. Iterar y enviar cada mensaje por Whapi
    for (const rec of recordatorios) {
      try {
        // Limpiar el número
        let numeroLimpio = rec.telefono.replace(/[\s\-\(\)\+]/g, '');
        if (numeroLimpio.startsWith('0')) numeroLimpio = numeroLimpio.substring(1);
        if (numeroLimpio.length <= 10) numeroLimpio = '52' + numeroLimpio; // Código de país por defecto

        const mensaje = `💰 *Recordatorio de GastoFácil*\n\n📋 *${rec.tipo}*\n${rec.detalle}\n\n_Este recordatorio fue programado desde tu asesor financiero Pepe._`;

        // Llamar a la API de Whapi
        const response = await fetch('https://gate.whapi.cloud/messages/text', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHAPI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: numeroLimpio,
            body: mensaje,
            typing_time: 2
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Error de Whapi: ${response.status} ${errText}`);
        }

        // Si se envía exitosamente, actualizar estado a "enviado"
        await supabase
          .from('recordatorios_whatsapp')
          .update({ estado: 'enviado' })
          .eq('id', rec.id);

        resultados.push({ id: rec.id, status: 'success' });
        
        // Pequeña pausa para no saturar la API (ej. 500ms)
        await new Promise(r => setTimeout(r, 500));

      } catch (err) {
        console.error(`Error enviando recordatorio ${rec.id}:`, err);
        
        // Opcional: Marcar como "error" para no intentar infinitamente
        // await supabase.from('recordatorios_whatsapp').update({ estado: 'error' }).eq('id', rec.id);
        
        resultados.push({ id: rec.id, status: 'error', error: String(err) });
      }
    }

    return new Response(JSON.stringify({ 
      message: "Procesamiento completado", 
      resultados 
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Error global en la función:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

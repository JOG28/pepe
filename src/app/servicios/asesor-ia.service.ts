import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface MensajeChat {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ContextoFinanciero {
  ingresos: any[];
  metas: any[];
  totalGastosMes: number;
  gastosRecientes: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AsesorIAService {

  // =====================================
  // CONFIGURACIÓN
  // =====================================

  private readonly OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly MODELO = 'openai/gpt-oss-20b:free';

  // =====================================
  // SYSTEM PROMPT
  // =====================================

  private generarSystemPrompt(contexto: ContextoFinanciero | null, tieneWhatsApp: boolean): string {
    const ahora = new Date().toLocaleString('es-MX', { timeZone: 'America/Mazatlan' });

    let prompt = `Eres "Pepe", un asesor financiero personal amigable y profesional.
Tu trabajo es ayudar al usuario con sus finanzas personales de manera clara, útil y amigable.

REGLAS GENERALES:
- Responde SIEMPRE en español de México.
- Sé conciso. No des respuestas largas a menos que sea necesario.
- Usa emojis ocasionalmente para hacer la conversación más amigable.
- Da consejos prácticos y accionables basados en la información del usuario.
- Si no tienes suficiente información, pregunta al usuario.
- NUNCA inventes datos financieros que no te hayan dado.
- Si te preguntan algo fuera de finanzas, redirige la conversación amablemente.`;

    if (tieneWhatsApp) {
      prompt += `

========================================================
CAPACIDAD ESPECIAL: ENVIAR MENSAJES POR WHATSAPP
========================================================
El usuario tiene WhatsApp conectado. Tienes la capacidad de enviarle mensajes o recordatorios directamente a su WhatsApp.

CUÁNDO USAR ESTA CAPACIDAD:
Úsala cuando el usuario pida cosas como:
- "recuérdame...", "ponme un recordatorio...", "avísame..."
- "mándame un mensaje...", "mándame algo...", "mándame un consejo..."
- "ahorita mándame...", "ya mándame...", "ahora mismo..."

CÓMO HACERLO — REGLA OBLIGATORIA:
Al final de tu respuesta (después de tu texto normal), DEBES agregar un bloque de datos con este formato exacto.
¡NO lo omitas o el sistema no funcionará!

--- CASO A: El usuario quiere el mensaje AHORA / de inmediato ---
Palabras clave: "ahorita", "ahora", "ya", "en este momento", "ya mismo", "mándame algo"
Formato (SIN campo fecha):
[RECORDATORIO_WHATSAPP]{"tipo":"Tipo del mensaje","detalle":"Contenido del mensaje que recibirá el usuario en WhatsApp"}[/RECORDATORIO_WHATSAPP]

Ejemplo:
Usuario: "mándame un consejo de ahorro ahorita"
Tu respuesta: ¡Aquí va tu consejo! 💡
[RECORDATORIO_WHATSAPP]{"tipo":"Consejo de ahorro","detalle":"💰 Tip del día: Antes de comprar algo, pregúntate si lo necesitas o solo lo quieres. Esa pausa puede ahorrarte mucho dinero al mes."}[/RECORDATORIO_WHATSAPP]

--- CASO B: El usuario quiere el mensaje para una fecha/hora futura ---
Palabras clave: "mañana", "el viernes", "a las 5pm", "el día 15", "la próxima semana"
Formato (CON campo fecha en ISO 8601):
[RECORDATORIO_WHATSAPP]{"tipo":"Tipo del recordatorio","detalle":"Contenido del mensaje que recibirá el usuario","fecha":"YYYY-MM-DDTHH:mm:ss"}[/RECORDATORIO_WHATSAPP]

Ejemplo:
Usuario: "recuérdame mañana pagar la tarjeta"
Tu respuesta: ¡Claro! Te mando el recordatorio para mañana. 📅
[RECORDATORIO_WHATSAPP]{"tipo":"Pago de tarjeta","detalle":"💳 Recuerda: Hoy es día de pagar tu tarjeta de crédito. ¡Hazlo a tiempo para evitar cargos por mora!","fecha":"${new Date(Date.now() + 86400000).toISOString().split('T')[0]}T09:00:00"}[/RECORDATORIO_WHATSAPP]

HORA ACTUAL DEL SISTEMA: ${ahora}
Usa esta fecha/hora como referencia para calcular fechas relativas ("mañana", "el viernes", etc.).
Si el usuario da una fecha pero NO da hora, usa las 09:00:00 por defecto.
========================================================`;
    }

    if (contexto) {
      prompt += '\n\n--- CONTEXTO FINANCIERO DEL USUARIO ---\n';

      if (contexto.ingresos.length > 0) {
        prompt += '\nIngresos registrados:\n';
        for (const ingreso of contexto.ingresos) {
          prompt += `- ${ingreso.nombre}: $${Number(ingreso.monto).toLocaleString('es-MX')} (${ingreso.frecuencia})\n`;
        }
      } else {
        prompt += '\nEl usuario NO ha registrado ingresos.\n';
      }

      if (contexto.totalGastosMes > 0) {
        prompt += `\nTotal gastado este mes: $${contexto.totalGastosMes.toLocaleString('es-MX')}\n`;
      }

      if (contexto.gastosRecientes.length > 0) {
        prompt += '\nÚltimos gastos registrados:\n';
        for (const gasto of contexto.gastosRecientes) {
          const concepto = gasto.concepto || 'Sin concepto';
          const monto = Number(gasto.monto);
          const establecimiento = gasto.establecimiento || '';
          prompt += `- ${concepto}${establecimiento ? ' en ' + establecimiento : ''}: $${monto.toLocaleString('es-MX')}\n`;
        }
      }

      if (contexto.metas.length > 0) {
        prompt += '\nMetas financieras:\n';
        for (const meta of contexto.metas) {
          const objetivo = Number(meta.monto_objetivo);
          const actual = Number(meta.monto_actual || 0);
          const progreso = objetivo > 0 ? Math.round((actual / objetivo) * 100) : 0;
          prompt += `- ${meta.titulo}: $${actual.toLocaleString('es-MX')} de $${objetivo.toLocaleString('es-MX')} (${progreso}%)\n`;
        }
      } else {
        prompt += '\nEl usuario NO ha registrado metas financieras.\n';
      }

      prompt += '\n--- FIN DEL CONTEXTO ---\n';
      prompt += '\nUsa esta información para dar consejos personalizados cuando sea relevante, pero no repitas toda la información al usuario a menos que la pida.';
    }

    return prompt;
  }

  // =====================================
  // ENVIAR MENSAJE A LA IA
  // =====================================

  async enviarMensaje(
    historialMensajes: MensajeChat[],
    mensajeUsuario: string,
    contexto: ContextoFinanciero | null,
    tieneWhatsApp: boolean = false
  ): Promise<string> {

    try {
      // Construir mensajes para la API
      const messages: MensajeChat[] = [
        {
          role: 'system',
          content: this.generarSystemPrompt(contexto, tieneWhatsApp)
        },
        ...historialMensajes,
        {
          role: 'user',
          content: mensajeUsuario
        }
      ];

      const requestBody = {
        model: this.MODELO,
        messages: messages,
        max_tokens: 800,
        temperature: 0.7
      };

      const response = await fetch(this.OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${environment.openRouterApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter Error:', response.status, errorText);
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No se recibió respuesta del modelo.');
      }

      return data.choices[0].message.content.trim();

    } catch (error: any) {
      console.error('Error al comunicarse con el asesor IA:', error);

      if (error.message?.includes('429')) {
        return 'Lo siento, el servicio está temporalmente saturado. Por favor intenta de nuevo en unos segundos. 🙏';
      }

      if (error.message?.includes('401') || error.message?.includes('403')) {
        return 'Hay un problema con la configuración del servicio. Por favor contacta al soporte. 🔧';
      }

      return 'Lo siento, no pude procesar tu mensaje en este momento. Por favor intenta de nuevo. 😔';
    }
  }

  // =====================================
  // GENERAR TÍTULO AUTOMÁTICO
  // =====================================

  async generarTitulo(primerMensaje: string): Promise<string> {
    try {
      const requestBody = {
        model: this.MODELO,
        messages: [
          {
            role: 'system',
            content: 'Genera un título muy corto (máximo 5 palabras) para una conversación que empieza con el siguiente mensaje. Responde SOLO con el título, sin comillas ni puntos.'
          },
          {
            role: 'user',
            content: primerMensaje
          }
        ],
        max_tokens: 30,
        temperature: 0.5
      };

      const response = await fetch(this.OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${environment.openRouterApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        return 'Nueva conversación';
      }

      const data = await response.json();
      const titulo = data.choices?.[0]?.message?.content?.trim() || 'Nueva conversación';
      // Limitar a 40 caracteres
      return titulo.length > 40 ? titulo.substring(0, 37) + '...' : titulo;

    } catch {
      return 'Nueva conversación';
    }
  }

  // =====================================
  // PARSEAR RECORDATORIO DE LA RESPUESTA
  // =====================================

  parsearRecordatorio(respuesta: string): { tipo: string; detalle: string; fecha: string; textoLimpio: string } | null {
    const regex = /\[RECORDATORIO_WHATSAPP\](.*?)\[\/RECORDATORIO_WHATSAPP\]/s;
    const match = respuesta.match(regex);

    if (!match) return null;

    try {
      const data = JSON.parse(match[1]);
      const textoLimpio = respuesta.replace(regex, '').trim();
      return {
        tipo: data.tipo || 'Recordatorio',
        detalle: data.detalle || '',
        fecha: data.fecha || '',
        textoLimpio: textoLimpio
      };
    } catch (error) {
      console.error('Error al parsear recordatorio:', error);
      return null;
    }
  }
}


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
  private readonly MODELO = 'poolside/laguna-m.1:free';

  // =====================================
  // SYSTEM PROMPT
  // =====================================

  private generarSystemPrompt(contexto: ContextoFinanciero | null, tieneWhatsApp: boolean): string {
    let prompt = `Eres un asesor financiero personal amigable y profesional llamado "Pepe". 
Tu objetivo es ayudar a los usuarios a manejar mejor sus finanzas personales.

Reglas:
- Responde siempre en español de México, de forma clara y accesible.
- Sé conciso pero útil. No uses respuestas excesivamente largas.
- Usa emojis ocasionalmente para hacer la conversación más amigable.
- Da consejos prácticos y accionables.
- Si no tienes suficiente información, pregunta al usuario.
- Nunca inventes datos financieros del usuario que no te hayan proporcionado.
- No des consejos de inversión específicos ni recomiendes productos financieros concretos.
- Si te preguntan algo fuera del ámbito financiero, redirige amablemente la conversación.`;

    if (tieneWhatsApp) {
      prompt += `

FUNCIÓN ESPECIAL - RECORDATORIOS POR WHATSAPP:
El usuario tiene WhatsApp registrado. Si te pide un recordatorio, aviso, o que le mandes un mensaje, debes incluir al FINAL de tu respuesta (después de tu texto normal) un bloque especial con este formato exacto:

[RECORDATORIO_WHATSAPP]{"tipo":"Título corto del recordatorio","detalle":"Texto descriptivo del recordatorio","fecha":"YYYY-MM-DDTHH:MM:SS"}[/RECORDATORIO_WHATSAPP]

Ejemplos de cuándo activar esto:
- "Recuérdame pagar la luz mañana a las 10 am" → agrega el bloque con tipo "Pago de luz", detalle "Recuerda pagar tu recibo de luz a tiempo para evitar recargos." y la fecha calculada.
- "Mándame un mensaje para ahorrar el viernes" → tipo "Consejo de ahorro", detalle con un consejo y fecha calculada para el próximo viernes.

Fecha y hora actual del sistema: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}. Usa esta fecha para calcular correctamente cuando el usuario pida un recordatorio relativo (ej. "mañana", "el próximo lunes"). Si el usuario no especifica una hora, asume por defecto las 09:00:00.

Primero responde normalmente confirmando que programarás el recordatorio, y luego agrega el bloque al final.
Si el usuario NO pide un recordatorio, NO incluyas el bloque.`;
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


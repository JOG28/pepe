import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IAService {

  // =====================================
  // ANALIZAR TICKET CON VISIÓN VIA OPENROUTER
  // =====================================

  async analizarTicket(
    imagenBase64: string
  ): Promise<string> {

    try {

      // Prompt para análisis de ticket
      const prompt = ` eres un analista de imagenes para sacar datos y registrarlos vas a hacer lo siguiente: Analiza esta imagen de un ticket de compra y extrae la información en formato JSON con esta estructura exacta:
{
  "negocio": "nombre del establecimiento",
  "fecha": "YYYY-MM-DD",
  "productos": [
    { "nombre": "nombre del producto", "precio": 0.00 }
  ],
  "total": 0.00
}

Reglas:
- Si no puedes detectar el negocio, usa "Ticket Detectado"
- Si no puedes detectar la fecha, usa la fecha de hoy
- Los precios deben ser numéricos (sin símbolos de moneda)
- Responde SOLO con el JSON, sin texto adicional ni bloques de código markdown`;

      const requestBody = {
        model: "google/gemma-4-26b-a4b-it:free", // Modelo GRATUITO que SÍ soporta VISIÓN (imágenes)
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imagenBase64
                }
              }
            ]
          }
        ]
      };

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${environment.openRouterApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // La respuesta viene en choices[0].message.content
      const content = data.choices[0].message.content;

      // Limpiar markdown si la IA de todas formas lo envía
      let jsonLimpio = content.trim();
      if (jsonLimpio.startsWith("```json")) {
        jsonLimpio = jsonLimpio.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (jsonLimpio.startsWith("```")) {
        jsonLimpio = jsonLimpio.replace(/^```/, "").replace(/```$/, "").trim();
      }

      return jsonLimpio;

    } catch (error) {
      console.error('Error al analizar ticket con OpenRouter:', error);
      throw error;
    }

  }

}

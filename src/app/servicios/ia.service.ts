import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IAService {

  // =====================================
  // CLIENTE GEMINI
  // =====================================

  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(
      environment.geminiApiKey
    );
  }

  // =====================================
  // ANALIZAR TICKET CON VISIÓN
  // =====================================

  async analizarTicket(
    imagenBase64: string
  ): Promise<string> {

    try {

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash'
      });

      // Extraer el tipo MIME y los datos base64 puros
      const matches = imagenBase64.match(
        /^data:(image\/\w+);base64,(.+)$/
      );

      if (!matches) {
        throw new Error(
          'Formato de imagen no válido'
        );
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      // Prompt para análisis de ticket
      const prompt = `Analiza esta imagen de un ticket de compra y extrae la información en formato JSON con esta estructura exacta:
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

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        }
      ]);

      const response = await result.response;
      return response.text();

    } catch (error) {

      console.error(
        'Error al analizar ticket con Gemini:',
        error
      );

      throw error;

    }

  }

}

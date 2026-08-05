import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WhapiService {

  // =====================================
  // CONFIGURACIÓN
  // =====================================

  private readonly WHAPI_URL = 'https://gate.whapi.cloud/messages/text';

  // =====================================
  // ENVIAR MENSAJE DE TEXTO POR WHATSAPP
  // =====================================

  async enviarMensaje(telefono: string, mensaje: string): Promise<boolean> {
    try {
      // Limpiar el número de teléfono (quitar espacios, guiones, paréntesis, +)
      let numeroLimpio = telefono.replace(/[\s\-\(\)\+]/g, '');
      if (numeroLimpio.startsWith('0')) numeroLimpio = numeroLimpio.substring(1);
      if (numeroLimpio.length <= 10) numeroLimpio = '52' + numeroLimpio;

      // Llamar a la Netlify Function (intermediario en el servidor, sin CORS)
      const response = await fetch('/.netlify/functions/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: numeroLimpio, mensaje })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en send-whatsapp function:', response.status, errorText);
        return false;
      }

      const data = await response.json();
      console.log('Mensaje WhatsApp enviado:', data);
      return true;

    } catch (error) {
      console.error('Error al enviar mensaje WhatsApp:', error);
      return false;
    }
  }

  // =====================================
  // ENVIAR RECORDATORIO FINANCIERO
  // =====================================

  async enviarRecordatorio(
    telefono: string,
    tipo: string,
    detalle: string
  ): Promise<boolean> {
    const mensaje = `💰 *Recordatorio de GastoFácil*\n\n📋 *${tipo}*\n${detalle}\n\n_Este recordatorio fue programado desde tu asesor financiero Pepe._`;
    return this.enviarMensaje(telefono, mensaje);
  }
}

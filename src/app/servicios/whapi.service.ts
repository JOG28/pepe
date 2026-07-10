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

      // Si empieza con 0, quitarlo
      if (numeroLimpio.startsWith('0')) {
        numeroLimpio = numeroLimpio.substring(1);
      }

      // Si no tiene código de país (menos de 12 dígitos), agregar 52 (México)
      if (numeroLimpio.length <= 10) {
        numeroLimpio = '52' + numeroLimpio;
      }

      const requestBody = {
        to: numeroLimpio,
        body: mensaje,
        typing_time: 2
      };

      const response = await fetch(this.WHAPI_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${environment.whapiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Whapi Error:', response.status, errorText);
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

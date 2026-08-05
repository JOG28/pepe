// netlify/functions/send-whatsapp.js
// Esta función corre en el SERVIDOR de Netlify, no en el navegador.
// Evita el error de CORS porque las llamadas servidor-a-servidor no tienen esa restricción.

exports.handler = async (event) => {
  // Solo aceptar POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const WHAPI_API_KEY = process.env.WHAPI_API_KEY;
  if (!WHAPI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'WHAPI_API_KEY no configurada en Netlify' })
    };
  }

  try {
    const { telefono, mensaje } = JSON.parse(event.body);

    if (!telefono || !mensaje) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Faltan campos: telefono y mensaje son requeridos' })
      };
    }

    // Limpiar número de teléfono
    let numeroLimpio = telefono.replace(/[\s\-\(\)\+]/g, '');
    if (numeroLimpio.startsWith('0')) numeroLimpio = numeroLimpio.substring(1);
    if (numeroLimpio.length <= 10) numeroLimpio = '521' + numeroLimpio;

    // Llamar a Whapi desde el servidor (sin CORS)
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

    const data = await response.json();

    if (!response.ok) {
      console.error('Whapi Error:', response.status, data);
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Error de Whapi', details: data })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, data })
    };

  } catch (err) {
    console.error('Error en send-whatsapp function:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};

# Despliegue de Edge Function: enviar-recordatorios

Esta función se encarga de leer la tabla `recordatorios_whatsapp` cada pocos minutos, encontrar los que ya cumplieron su fecha, enviarlos mediante la API de Whapi, y marcarlos como "enviado".

## Pasos para desplegar

1. Instala el CLI de Supabase en tu computadora si no lo tienes:
   `npm install -g supabase`

2. Inicia sesión en Supabase desde la terminal:
   `supabase login`

3. Vincula tu proyecto de Supabase (necesitarás el Project Ref de la URL de tu panel):
   `supabase link --project-ref TU_PROJECT_REF`

4. Despliega la función:
   `supabase functions deploy enviar-recordatorios --no-verify-jwt`

5. Configura tu token de Whapi como un "secreto" en Supabase:
   `supabase secrets set WHAPI_API_KEY="AQUÍ_TU_TOKEN_DE_WHAPI"`
   (El `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` se inyectan solos automáticamente por Supabase, así que no te preocupes por esos).

## Configurar el Cron Job (pg_cron)
Para que esta función se ejecute automáticamente (ej. cada 5 minutos), ve al panel web de tu Supabase -> **Database** -> **Extensions** y habilita `pg_cron`.
Luego ve al SQL Editor y corre este comando para programar la llamada:

```sql
select
  cron.schedule(
    'invoke-enviar-recordatorios',
    '*/5 * * * *', -- Ejecutar cada 5 minutos
    $$
    select
      net.http_post(
          url:='https://TU_PROJECT_REF.supabase.co/functions/v1/enviar-recordatorios',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_ANON_KEY"}'::jsonb
      ) as request_id;
    $$
  );
```

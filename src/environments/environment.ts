// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,

  // Supabase
  supabaseUrl: 'https://emygdjxixfhaurxofyel.supabase.co',
  supabaseKey: 'sb_publishable_TcXkD2bADJLkBv19ZwNUJg_b6gXWXmx',

  // Google Gemini (Ahora inyectado via Netlify)
  geminiApiKey: '',

  // OpenRouter (Ahora inyectado via Netlify)
  openRouterApiKey: '',

  // Whapi (WhatsApp API - Inyectado via Netlify)
  whapiApiKey: ''
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

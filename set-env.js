const fs = require('fs');

const targetPath = './src/environments/environment.prod.ts';

const envConfigFile = `
export const environment = {
  production: true,
  supabaseUrl: 'https://emygdjxixfhaurxofyel.supabase.co',
  supabaseKey: 'sb_publishable_TcXkD2bADJLkBv19ZwNUJg_b6gXWXmx',
  geminiApiKey: '${process.env.GEMINI_API_KEY || ''}',
  openRouterApiKey: '${process.env.OPENROUTER_API_KEY || ''}'
};
`;

fs.writeFileSync(targetPath, envConfigFile);
console.log(`El archivo environment.prod.ts fue generado dinámicamente con éxito.`);

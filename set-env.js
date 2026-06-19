const fs = require('fs');

const targetPath = './src/environments/environment.prod.ts';

const envConfigFile = `
export const environment = {
  production: true,
  supabaseUrl: 'https://yzhraaiydfkaypnkliin.supabase.co',
  supabaseKey: 'sb_publishable__6Ye1i3pO_fmDufIPwxIuA_smXCDuGE',
  geminiApiKey: '${process.env.GEMINI_API_KEY || ''}',
  openRouterApiKey: ''
};
`;

fs.writeFileSync(targetPath, envConfigFile);
console.log(`El archivo environment.prod.ts fue generado dinámicamente con éxito.`);

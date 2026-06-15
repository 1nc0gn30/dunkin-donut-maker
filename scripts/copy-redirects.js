import fs from 'fs';
import path from 'path';

const publicRedirects = path.join(process.cwd(), 'public', '_redirects');
const distRedirects = path.join(process.cwd(), 'dist', '_redirects');

let content = '# Netlify Redirects\n';
if (fs.existsSync(publicRedirects)) {
  content = fs.readFileSync(publicRedirects, 'utf8').trim();
}

// SPA fallback is needed for production but breaks Vite dev server.
// Do NOT run netlify dev while dist/ exists — delete dist/ first.
if (!content.includes('/* /index.html 200')) {
  content += '\n\n# SPA fallback - all other routes serve index.html\n/* /index.html 200';
}

fs.mkdirSync(path.dirname(distRedirects), { recursive: true });
fs.writeFileSync(distRedirects, content.trim() + '\n');
console.log('Copied SPA fallback redirect to', distRedirects);

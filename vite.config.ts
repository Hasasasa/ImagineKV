import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const terminalLogPlugin = (): Plugin => ({
  name: 'terminal-log',
  configureServer(server) {
    server.middlewares.use('/__log', (req, res, next) => {
      if (req.method !== 'POST') return next();
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const { channel = '?', level = 'log', args = [] } = JSON.parse(body || '{}');
          const ts = new Date().toISOString().slice(11, 23);
          const colors: Record<string, string> = {
            log: '\x1b[36m', info: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m',
          };
          const c = colors[level] || '\x1b[36m';
          const tag = `${c}[${ts}] [${channel}]\x1b[0m`;
          const fn = (console as any)[level] || console.log;
          fn(tag, ...args);
        } catch (e) {
          console.error('[terminal-log] bad payload', e);
        }
        res.statusCode = 204;
        res.end();
      });
    });
  },
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), terminalLogPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

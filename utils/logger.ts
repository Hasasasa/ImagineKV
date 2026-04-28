type Level = 'log' | 'info' | 'warn' | 'error';

const safe = (a: any) => {
  try {
    JSON.stringify(a);
    return a;
  } catch {
    return String(a);
  }
};

const send = (channel: string, level: Level, args: any[]) => {
  const prefix = `[${channel}]`;
  // eslint-disable-next-line no-console
  (console[level] || console.log)(prefix, ...args);

  if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
  try {
    fetch('/__log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, level, args: args.map(safe) }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
};

export const log = (channel: string, ...args: any[]) => send(channel, 'log', args);
export const info = (channel: string, ...args: any[]) => send(channel, 'info', args);
export const warn = (channel: string, ...args: any[]) => send(channel, 'warn', args);
export const error = (channel: string, ...args: any[]) => send(channel, 'error', args);

import { io } from 'socket.io-client';

let socket = null;
let lastToken = null;
let lastUrl = null;

export function initSocket(token) {
  // If an existing socket has a different token, reset it to avoid auth issues
  if (socket && lastToken && lastToken !== token) {
    try { socket.disconnect(); } catch {}
    socket = null;
  }
  if (socket) {
    // If existing socket is not connected attempt a manual reconnect
    if (!socket.connected) {
      try { console.log('[socket] existing instance not connected – attempting manual connect'); } catch {}
      socket.connect();
    }
    return socket;
  }

  // Fallback to backend default port 5000
  const base = import.meta.env.VITE_API_WS_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000');
  // Remove trailing /api only if present
  const wsUrl = base.endsWith('/api') ? base.slice(0, -4) : base;
  lastUrl = wsUrl;
  const tokenPreview = token ? String(token).slice(0, 12) + '…' : 'none';
  try {
    console.log('[socket] initSocket → url:', wsUrl, 'token?', !!token, 'tokenPreview=', tokenPreview);
  } catch {}

  // Allow both polling + websocket for initial handshake robustness
  socket = io(wsUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 800,
    timeout: 8000,
  });

  try {
    socket.on('connect', () => console.log('[socket] connect id=', socket.id, 'connected=', socket.connected));
    socket.on('connect_error', (err) => {
      console.error('[socket] connect_error:', err?.message || err);
      if (err && err.message === 'Authentication error') {
        console.error('[socket] auth failed – check JWT, expiry, or env mismatch');
      }
    });
    socket.on('error', (err) => console.error('[socket] error:', err));
    socket.on('reconnect_attempt', (n) => console.log('[socket] reconnect_attempt', n));
    socket.on('reconnect', (n) => console.log('[socket] reconnect success attempt=', n));
    socket.on('reconnect_error', (err) => console.error('[socket] reconnect_error:', err?.message || err));
    socket.on('reconnect_failed', () => console.error('[socket] reconnect_failed – giving up after attempts'));
    socket.on('disconnect', (reason) => console.warn('[socket] disconnect reason=', reason));
    socket.io.on('ping', () => console.log('[socket] ping'));
    socket.io.on('pong', (latency) => console.log('[socket] pong latency=', latency));
  } catch {}

  lastToken = token;
  return socket;
}

export function getSocket() {
  return socket;
}

export function closeSocket() {
  if (!socket) {
    return;
  }
  try { console.log('[socket] closeSocket'); } catch {}
  socket.disconnect();
  socket = null;
  lastToken = null;
}

export function getLastSocketUrl() { return lastUrl; }

export default { initSocket, getSocket, closeSocket, getLastSocketUrl };

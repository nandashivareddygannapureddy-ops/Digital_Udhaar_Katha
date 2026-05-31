import { io } from 'socket.io-client';

const getBackendUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }
  if (import.meta.env.PROD) {
    return 'https://digital-udhaar-katha.onrender.com';
  }
  return 'http://localhost:4000';
};

const backendUrl = getBackendUrl();

let socket = null;

export const initSocket = () => {
  if (socket) return socket;

  socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Connected to real-time sync server:', socket.id);
  });

  socket.on('refresh_data', (data) => {
    console.log('Received real-time refresh signal:', data);
    // Dispatch a custom window event that React components can listen to
    const event = new CustomEvent('socket_refresh', { detail: data });
    window.dispatchEvent(event);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from real-time sync server');
  });

  return socket;
};

export const getSocket = () => socket;

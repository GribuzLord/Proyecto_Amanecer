import axios from 'axios';

// En desarrollo, Vite hace proxy de '/api' hacia tu backend local (ver vite.config.js).
// En producción (Netlify), no hay proxy: defines VITE_API_URL en las variables de
// entorno de Netlify apuntando a tu backend de Render, ej:
// VITE_API_URL=https://tu-backend.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL });

// Adjunta el token guardado a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

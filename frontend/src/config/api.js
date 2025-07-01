// frontend/src/config/api.js

const getApiUrl = () => {
  // Environment variable'dan al (eğer varsa)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Production'da Vercel URL'ini kullan
  if (process.env.NODE_ENV === 'production') {
    return `${window.location.origin}/api`;
  }
  
  // Development'da localhost kullan
  return 'http://localhost:5000/api';
};

const getSocketUrl = () => {
  // Environment variable'dan al (eğer varsa)
  if (process.env.REACT_APP_SOCKET_URL) {
    return process.env.REACT_APP_SOCKET_URL;
  }
  
  // Production'da window.location.origin kullan
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  
  // Development'da localhost kullan
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_BASE_URL = getSocketUrl();

console.log('Environment:', process.env.NODE_ENV);
console.log('API Base URL:', API_BASE_URL);
console.log('Socket Base URL:', SOCKET_BASE_URL);
// frontend/src/config/api.js

const getApiUrl = () => {
  // Production'da Vercel URL'ini kullan
  if (process.env.NODE_ENV === 'production') {
    return `${window.location.origin}/api`;
  }
  
  // Development'da localhost kullan
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiUrl();

console.log('Environment:', process.env.NODE_ENV);
console.log('KAHOOT v2 API Base URL:', API_BASE_URL);
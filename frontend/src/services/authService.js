// frontend/src/services/authService.js
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const login = async (credentials) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);

    if (response.data && response.data.token) {
      localStorage.setItem('userToken', response.data.token);
      if (response.data.user) {
        localStorage.setItem('userData', JSON.stringify(response.data.user));
      }
      console.log('Login successful, token stored:', response.data.token);
    }
    return response.data;
  } catch (error) {
    console.error('Login API error:', error.response?.data || error.message);
    throw error.response?.data || { message: 'Login failed due to an unexpected server error.' };
  }
};

const register = async (userData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
    console.log('Registration successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Register API error:', error.response?.data || error.message);
    throw error.response?.data || { message: 'Registration failed due to an unexpected server error.' };
  }
};

const logout = () => {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
  console.log('User logged out, token removed.');
};

const getCurrentUserToken = () => {
  return localStorage.getItem('userToken');
};

const getCurrentUser = () => {
  const userDataString = localStorage.getItem('userData');
  try {
    return userDataString ? JSON.parse(userDataString) : null;
  } catch (error) {
    console.error("Error parsing user data from localStorage", error);
    return null;
  }
};

const authService = {
  login,
  register,
  logout,
  getCurrentUserToken,
  getCurrentUser,
};

export default authService;
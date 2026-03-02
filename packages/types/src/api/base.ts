import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

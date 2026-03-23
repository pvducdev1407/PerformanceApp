// src/services/axiosClient.ts
import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';

const instance: AxiosInstance = axios.create({
  baseURL: 'http://localhost:5178/api',
  timeout: 300_000, // 5 phút
});

// ✅ Interceptor xử lý response: lấy response.data
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response; // Lấy phần data để dùng trực tiếp
  },
  (error: AxiosError) => {
    console.error('API Error:', error);
    return Promise.reject(error); // Rất quan trọng: tránh promise undefined
  }
);

export default instance;

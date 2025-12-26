import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

export const authAPI = {
  login: (credentials) => api.post('/auth/token', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyToken: () => api.get('/auth/verify'),
}

export const chatAPI = {
  // حالت مشاوره
  sendAdvice: (message) => api.post('/chat/advice', message),
  
  // حالت جمع‌آوری داده
  sendDataCollection: (data) => api.post('/chat/data-collection', data),
  
  // endpointهای قدیمی (برای سازگاری)
  sendMessage: (message) => api.post('/chat', message),
  sendPersianMessage: (message) => api.post('/chat/persian', message),
  
  // تست
  testMessage: (message) => api.post('/chat/test', message),
  testPersianMessage: (message) => api.post('/chat/persian/test', message),
  
  // اطلاعات حالت‌ها
  getModes: () => api.get('/chat/modes'),
}

export const profileAPI = {
  getProfile: () => api.get('/preferences/profile'),
  updateModel: (modelName) => api.put('/preferences/model', { model_name: modelName }),
  getModels: () => api.get('/preferences/models'),
  getCurrentModel: () => api.get('/preferences/current-model'),
}

export const healthAPI = {
  getHealthProfile: () => api.get('/health/profile'),
  updateAssessment: (data) => api.post('/health/assessment', data),
  shouldAssess: () => api.get('/health/should-assess'),
}

export default api

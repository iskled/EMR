import api from '../api/axios'

export const getDashboard = (date) => api.get('/dashboard/', { params: date ? { date } : undefined }).then(response => response.data)

export default { getDashboard }

import api from '../api/axios'
export const getClinicSettings=async()=>(await api.get('/settings/clinic/')).data
export const updateClinicSettings=async payload=>{if(payload instanceof FormData)return(await api.patch('/settings/clinic/',payload)).data;return(await api.patch('/settings/clinic/',payload)).data}

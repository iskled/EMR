import api from '../api/axios'

export const getToothChart = async (
  patientId
) => {
  let response = await api.get(
    `/tooth-charts/?patient=${patientId}`
  )
  const results = Array.isArray(response.data) ? response.data : response.data?.results || []
  if (results.length) return { count: results.length, results }
  try {
    const created = await api.post('/tooth-charts/', {
      patient: patientId,
      dentition_type: 'adult',
      notes: '',
    })
    return { count: 1, results: [created.data] }
  } catch {
    response = await api.get(`/tooth-charts/?patient=${patientId}`)
    const retryResults = Array.isArray(response.data) ? response.data : response.data?.results || []
    return { count: retryResults.length, results: retryResults }
  }
}

export const updateTooth = async (
  chartId,
  toothNumber,
  payload
) => {
  const response = await api.patch(
    `/tooth-charts/${chartId}/teeth/${toothNumber}/`,
    payload
  )

  return response.data
}

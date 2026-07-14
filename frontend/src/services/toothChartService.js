import api from '../api/axios'

export const getToothChart = async (
  patientId
) => {
  const response = await api.get(
    `/tooth-charts/?patient=${patientId}`
  )

  return response.data
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
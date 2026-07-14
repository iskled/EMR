import api from '../api/axios'

export async function getTreatmentPlans(
  patientId
) {

  const response = await api.get(
    '/treatment-plans/',
    {
      params: {
        patient: patientId
      }
    }
  )

  return response.data
}

export async function getTreatmentPlan(
  planId
) {

  const response = await api.get(
    `/treatment-plans/${planId}/`
  )

  return response.data
}

export async function createTreatmentPlan(
  payload
) {

  const response = await api.post(
    '/treatment-plans/',
    payload
  )

  return response.data
}

export async function updateTreatmentPlan(
  planId,
  payload
) {

  const response = await api.patch(
    `/treatment-plans/${planId}/`,
    payload
  )

  return response.data
}

export async function getPlanItems(
  planId
) {

  const response = await api.get(
    `/treatment-plans/${planId}/items/`
  )

  return response.data
}

export async function createPlanItem(
  planId,
  payload
) {

  const response = await api.post(
    `/treatment-plans/${planId}/items/`,
    payload
  )

  return response.data
}

export async function updatePlanItem(
  planId,
  itemId,
  payload
) {

  const response = await api.patch(
    `/treatment-plans/${planId}/items/${itemId}/`,
    payload
  )

  return response.data
}

export async function deletePlanItem(
  planId,
  itemId
) {

  await api.delete(
    `/treatment-plans/${planId}/items/${itemId}/`
  )
}
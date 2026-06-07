import api from '../api/axios'

/**
 * Get Patients
 */
export async function getPatients({
  search = '',
  page = 1,
} = {}) {

  try {

    const response = await api.get('/patients/', {
      params: {
        search,
        page,
      },
    })

    return response.data

  } catch (error) {

    console.error(
      'Failed to fetch patients:',
      error
    )

    throw error
  }
}

/**
 * Get Single Patient
 */
export async function getPatient(id) {

  try {

    const response = await api.get(
      `/patients/${id}/`
    )

    return response.data

  } catch (error) {

    console.error(
      'Failed to fetch patient:',
      error
    )

    throw error
  }
}

/**
 * Create Patient
 */
export async function createPatient(data) {

  try {

    const formData = new FormData()

    Object.keys(data).forEach((key) => {

      if (
        data[key] !== null &&
        data[key] !== undefined
      ) {
        formData.append(
          key,
          data[key]
        )
      }
    })

    const response = await api.post(
      '/patients/',
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    )

    return response.data

  } catch (error) {

    console.error(
      'Failed to create patient:',
      error
    )

    throw error
  }
}

/**
 * Update Patient
 */
export async function updatePatient(
  id,
  data
) {

  try {

    const response = await api.put(
      `/patients/${id}/`,
      data
    )

    return response.data

  } catch (error) {

    console.error(
      'Failed to update patient:',
      error
    )

    throw error
  }
}

/**
 * Archive/Delete Patient
 */
export async function deletePatient(id) {

  try {

    const response = await api.delete(
      `/patients/${id}/`
    )

    return response.data

  } catch (error) {

    console.error(
      'Failed to delete patient:',
      error
    )

    throw error
  }
}
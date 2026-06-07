import { useEffect, useState } from 'react'

import {
  getPatients,
} from '../services/patients.service'

export default function usePatients(
  search = ''
) {

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPatients()
  }, [search])

  const fetchPatients = async () => {

    try {

      setLoading(true)

      const data = await getPatients({
        search,
      })

      // Handles paginated DRF responses
      if (Array.isArray(data)) {
        setPatients(data)
      }

      else if (Array.isArray(data.results)) {
        setPatients(data.results)
      }

      else {
        setPatients([])
      }

    } catch (error) {

      console.error(
        'Patient fetch failed:',
        error
      )

      setPatients([])

    } finally {

      setLoading(false)
    }
  }

  return {
    patients,
    loading,
    refreshPatients: fetchPatients,
  }
}
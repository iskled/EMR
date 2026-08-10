import { lazy, Suspense, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { hasPermission } from '../../permissions/permissions'
import { getOrthodonticCases } from '../../services/orthodontics.service'
import StockUsageModal from '../inventory/StockUsageModal'
import PatientOrthodonticSummary from '../orthodontics/PatientOrthodonticSummary'

const ClinicalExperience = lazy(() => import('../clinical/experience/ClinicalExperience'))
const PatientOverview = lazy(() => import('./PatientOverview'))
const AppointmentHistory = lazy(() => import('./AppointmentHistory'))
const DocumentsPanel = lazy(() => import('./DocumentsPanel'))
const MedicalHistoryPanel = lazy(() => import('./MedicalHistoryPanel'))
const CommunicationsPanel = lazy(() => import('./CommunicationsPanel'))
const PatientTasksPanel = lazy(() => import('./PatientTasksPanel'))

const fallback = <div className="rounded-xl bg-white p-8 text-slate-500">Loading workspace...</div>

export default function PatientWorkspace({ patient, activeTab, clinicalTab, onClinicalTab }) {
  const { user } = useAuth() || {}
  const canRecordUsage = hasPermission(user, 'patients.view') && hasPermission(user, 'inventory.usage')
  const [orthoCase, setOrthoCase] = useState(null)
  const [usageOpen, setUsageOpen] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    if (!patient?.id) {
      setOrthoCase(null)
      return undefined
    }
    getOrthodonticCases({ patient: patient.id })
      .then(cases => active && setOrthoCase(cases[0] || null))
      .catch(() => active && setOrthoCase(null))
    return () => {
      active = false
    }
  }, [patient?.id])

  if (!patient) {
    return <div className="rounded-xl bg-white p-10 text-center text-slate-500">Select a patient to open their workspace.</div>
  }

  let panel
  if (activeTab === 'clinical') panel = <ClinicalExperience patient={patient} orthoCase={orthoCase} activeTab={clinicalTab} onTabChange={onClinicalTab} />
  else if (activeTab === 'orthodontics') panel = <PatientOrthodonticSummary orthoCase={orthoCase} />
  else if (activeTab === 'documents') panel = <DocumentsPanel patient={patient} />
  else if (activeTab === 'appointments') panel = <AppointmentHistory patient={patient} />
  else if (activeTab === 'medical-history') panel = <MedicalHistoryPanel patient={patient} />
  else if (activeTab === 'communications') panel = <CommunicationsPanel patient={patient} />
  else if (activeTab === 'tasks') panel = <PatientTasksPanel patient={patient} />
  else panel = <PatientOverview patient={patient} refreshKey={historyRefreshKey} />

  return (
    <div className="space-y-4">
      {canRecordUsage && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setUsageOpen(true)}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Record Inventory Usage
          </button>
        </div>
      )}
      <Suspense fallback={fallback}>{panel}</Suspense>
      {canRecordUsage && (
        <StockUsageModal
          open={usageOpen}
          initialPatient={patient}
          patientLocked
          onClose={() => setUsageOpen(false)}
          onSaved={() => setHistoryRefreshKey(value => value + 1)}
        />
      )}
    </div>
  )
}

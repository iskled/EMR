import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import CaseDashboard from '../components/orthodontics/CaseDashboard'
import CaseForm from '../components/orthodontics/CaseForm'
import CaseStatusBadge from '../components/orthodontics/CaseStatusBadge'
import VisitTimeline from '../components/orthodontics/VisitTimeline'
import MeasurementPanel from '../components/orthodontics/MeasurementPanel'
import ApplianceTracker from '../components/orthodontics/ApplianceTracker'
import ProgressTracker from '../components/orthodontics/ProgressTracker'
import TreatmentMilestones from '../components/orthodontics/TreatmentMilestones'
import TimelineFilters from '../components/orthodontics/TimelineFilters'
import ClinicalPhotos from '../components/orthodontics/ClinicalPhotos'
import DocumentPanel from '../components/orthodontics/DocumentPanel'
import VisitDrawer from '../components/orthodontics/VisitDrawer'
import PatientOrthodonticSummary from '../components/orthodontics/PatientOrthodonticSummary'
import ClinicalIntegration from '../components/orthodontics/ClinicalIntegration'
import { getPatients } from '../services/patients.service'
import { getDentists } from '../services/appointments.service'
import {
  archiveOrthodonticCase,
  getOrthodonticCase,
  getOrthodonticCases,
  getOrthodonticTimeline,
  getOrthodonticVisits,
} from '../services/orthodontics.service'

const tabs = ['Overview', 'Timeline', 'Measurements', 'Appliances', 'Photos', 'Documents']

export default function OrthodonticsPage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [patients, setPatients] = useState([])
  const [dentists, setDentists] = useState([])
  const [selectedCase, setSelectedCase] = useState(null)
  const [visits, setVisits] = useState([])
  const [timeline, setTimeline] = useState([])
  const [activeTab, setActiveTab] = useState('Overview')
  const [timelineFilter, setTimelineFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [caseFormOpen, setCaseFormOpen] = useState(false)
  const [visitDrawerOpen, setVisitDrawerOpen] = useState(false)
  const [editingVisit, setEditingVisit] = useState(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedCase?.id) {
      loadCaseWorkspace(selectedCase.id)
    }
  }, [selectedCase?.id])

  const selectedPatientCase = useMemo(() => selectedCase, [selectedCase])

  async function loadInitialData() {
    try {
      setLoading(true)
      setError('')
      const [caseData, patientData, dentistData] = await Promise.all([
        getOrthodonticCases(),
        getPatients({ page: 1 }),
        getDentists(),
      ])
      setCases(caseData)
      setPatients(patientData.results || patientData)
      setDentists(dentistData)
      if (caseData.length) setSelectedCase(caseData[0])
    } catch {
      setError('Unable to load orthodontic workspace.')
    } finally {
      setLoading(false)
    }
  }

  async function loadCaseWorkspace(caseId) {
    try {
      const [detail, visitData, timelineData] = await Promise.all([
        getOrthodonticCase(caseId),
        getOrthodonticVisits({ ortho_case: caseId }),
        getOrthodonticTimeline(caseId),
      ])
      setSelectedCase(detail)
      setVisits(visitData)
      setTimeline(timelineData)
      setCases(prev => prev.map(item => (item.id === detail.id ? detail : item)))
    } catch {
      setNotice('Unable to refresh selected orthodontic case.')
    }
  }

  async function refreshAll() {
    const data = await getOrthodonticCases()
    setCases(data)
    if (selectedCase?.id) await loadCaseWorkspace(selectedCase.id)
    else if (data.length) setSelectedCase(data[0])
  }

  async function handleArchive() {
    if (!selectedCase) return
    await archiveOrthodonticCase(selectedCase.id)
    setNotice('Orthodontic case archived.')
    await refreshAll()
  }

  function openVisit(visit) {
    setEditingVisit(visit)
    setVisitDrawerOpen(true)
  }

  function openNewVisit() {
    setEditingVisit(null)
    setVisitDrawerOpen(true)
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {notice}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orthodontics</h1>
          <p className="text-sm text-gray-500">Patient-owned orthodontic cases, visits, progress, appliances, photos, and documents.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => setCaseFormOpen(true)}>New Case</Button>
          <Button type="button" onClick={openNewVisit} disabled={!selectedCase} className="bg-emerald-700 hover:bg-emerald-800">Record Visit</Button>
          <Button type="button" onClick={() => selectedCase && setCaseFormOpen(true)} disabled={!selectedCase} className="bg-gray-700 hover:bg-gray-800">Edit Case</Button>
          <Button type="button" onClick={handleArchive} disabled={!selectedCase} className="bg-rose-700 hover:bg-rose-800">Archive</Button>
        </div>
      </div>

      <CaseDashboard cases={cases} selectedCase={selectedCase} loading={loading} error={error} />

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900">Case Registry</h2>
            </div>
            <div className="max-h-[580px] overflow-y-auto p-3">
              {loading ? (
                <p className="p-4 text-sm text-gray-500">Loading cases...</p>
              ) : cases.length ? (
                <div className="space-y-2">
                  {cases.map(orthoCase => (
                    <button
                      key={orthoCase.id}
                      type="button"
                      onClick={() => setSelectedCase(orthoCase)}
                      className={`w-full rounded-lg border p-3 text-left hover:border-blue-300 ${
                        selectedCase?.id === orthoCase.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{orthoCase.patient_name}</p>
                          <p className="text-sm text-gray-500">{orthoCase.stage || 'Stage not set'}</p>
                        </div>
                        <CaseStatusBadge status={orthoCase.status} />
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{orthoCase.progress_percent || 0}% progress</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-sm text-gray-500">No orthodontic cases yet.</p>
              )}
            </div>
          </div>
          <PatientOrthodonticSummary orthoCase={selectedPatientCase} />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${
                  activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <ProgressTracker orthoCase={selectedCase} />
              <TreatmentMilestones milestones={selectedCase?.milestones || []} />
              <ClinicalIntegration
                orthoCase={selectedCase}
                onOpenPatient={() => navigate('/patients')}
                onOpenAppointment={() => navigate('/appointments')}
              />
            </div>
          )}

          {activeTab === 'Timeline' && (
            <div className="space-y-4">
              <TimelineFilters value={timelineFilter} onChange={setTimelineFilter} />
              <VisitTimeline events={timeline} filter={timelineFilter} onVisitClick={() => openNewVisit()} />
            </div>
          )}

          {activeTab === 'Measurements' && (
            <MeasurementPanel orthoCase={selectedCase} visits={visits} />
          )}

          {activeTab === 'Appliances' && (
            <ApplianceTracker orthoCase={selectedCase} visits={visits} />
          )}

          {activeTab === 'Photos' && (
            <ClinicalPhotos orthoCase={selectedCase} visits={visits} onChanged={() => selectedCase && loadCaseWorkspace(selectedCase.id)} />
          )}

          {activeTab === 'Documents' && (
            <DocumentPanel orthoCase={selectedCase} onChanged={() => selectedCase && loadCaseWorkspace(selectedCase.id)} />
          )}
        </div>
      </div>

      <CaseForm
        open={caseFormOpen}
        orthoCase={selectedCase}
        patients={patients}
        onClose={() => setCaseFormOpen(false)}
        onSaved={refreshAll}
      />

      <VisitDrawer
        open={visitDrawerOpen}
        orthoCase={selectedCase}
        visit={editingVisit}
        dentists={dentists}
        onClose={() => setVisitDrawerOpen(false)}
        onSaved={() => selectedCase && loadCaseWorkspace(selectedCase.id)}
      />
    </div>
  )
}

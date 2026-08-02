import { useEffect, useState } from 'react'
import ReportFilters from '../components/reports/ReportFilters'
import ExportMenu from '../components/reports/ExportMenu'
import ReportsDashboard from '../components/reports/ReportsDashboard'
import AppointmentReport from '../components/reports/AppointmentReport'
import PatientReport from '../components/reports/PatientReport'
import ClinicalReport from '../components/reports/ClinicalReport'
import OrthodonticReport from '../components/reports/OrthodonticReport'
import InventoryReport from '../components/reports/InventoryReport'
import StaffProductivityReport from '../components/reports/StaffProductivityReport'
import SavedReportsPanel from '../components/reports/SavedReportsPanel'
import { getAppointmentTypes, getDentists } from '../services/appointments.service'
import { getInventoryCategories, getInventoryLocations, getSuppliers } from '../services/inventory.service'
import { getReport, getSavedReports, REPORT_TYPES, runSavedReport } from '../services/reports.service'

const initialFilters = {
  start_date: '',
  end_date: '',
  dentist: '',
  status: '',
  patient: '',
  appointment_type: '',
  inventory_category: '',
  inventory_location: '',
  supplier: '',
  staff_role: '',
  orthodontic_stage: '',
}

const reportComponents = {
  executive: ReportsDashboard,
  appointments: AppointmentReport,
  patients: PatientReport,
  clinical: ClinicalReport,
  orthodontics: OrthodonticReport,
  inventory: InventoryReport,
  staff: StaffProductivityReport,
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState('executive')
  const [filters, setFilters] = useState(initialFilters)
  const [report, setReport] = useState(null)
  const [savedReports, setSavedReports] = useState([])
  const [dentists, setDentists] = useState([])
  const [appointmentTypes, setAppointmentTypes] = useState([])
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadReferences()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(loadReport, 250)
    return () => clearTimeout(timeout)
  }, [reportType, filters])

  async function loadReferences() {
    const [dentistData, typeData, categoryData, locationData, supplierData, savedData] = await Promise.all([
      getDentists(),
      getAppointmentTypes(),
      getInventoryCategories(),
      getInventoryLocations(),
      getSuppliers(),
      getSavedReports(),
    ])
    setDentists(dentistData)
    setAppointmentTypes(typeData)
    setCategories(categoryData)
    setLocations(locationData)
    setSuppliers(supplierData)
    setSavedReports(savedData)
  }

  async function loadReport() {
    try {
      setLoading(true)
      setError('')
      const data = await getReport(reportType, filters)
      setReport(data)
    } catch {
      setReport(null)
      setError('Unable to load report.')
    } finally {
      setLoading(false)
    }
  }

  async function refreshSavedReports() {
    setSavedReports(await getSavedReports())
  }

  async function handleRunSaved(saved) {
    setReportType(saved.report_type)
    setFilters({ ...initialFilters, ...saved.filters })
    setReport(await runSavedReport(saved.id))
  }

  const ActiveReport = reportComponents[reportType]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Operational, clinical, orthodontic, inventory, appointment, and staff analytics.</p>
        </div>
        <ExportMenu reportType={reportType} filters={filters} />
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
        {REPORT_TYPES.map(type => (
          <button
            key={type.value}
            type="button"
            onClick={() => setReportType(type.value)}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${reportType === type.value ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            {type.label}
          </button>
        ))}
      </div>

      <ReportFilters
        filters={filters}
        dentists={dentists}
        appointmentTypes={appointmentTypes}
        categories={categories}
        locations={locations}
        suppliers={suppliers}
        onChange={setFilters}
        onReset={() => setFilters(initialFilters)}
      />

      <div className="grid grid-cols-1 2xl:grid-cols-[1fr_340px] gap-6">
        <div>
          {loading && <div className="rounded-lg border bg-white p-10 text-center text-gray-500">Loading report...</div>}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
          {!loading && !error && ActiveReport && <ActiveReport data={report} />}
          {report?.generated_at && (
            <p className="mt-4 text-xs text-gray-500">
              Generated {new Date(report.generated_at).toLocaleString()} with active filters.
            </p>
          )}
        </div>

        <SavedReportsPanel
          savedReports={savedReports}
          reportType={reportType}
          filters={filters}
          onRun={handleRunSaved}
          onChanged={refreshSavedReports}
        />
      </div>
    </div>
  )
}

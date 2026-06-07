import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import Input from '../components/ui/Input'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import PatientTable from '../components/patients/PatientTable'
import PatientWorkspace from '../components/patients/PatientWorkspace'
import PatientIntakeModal from '../components/patients/PatientIntakeModal'
import PatientEditModal from '../components/patients/PatientEditModal'
import PatientTabs from '../components/patients/PatientTabs'
import ClinicalAlerts from '../components/patients/ClinicalAlerts'
import { getPatients } from '../services/patients.service'

export default function PatientsPage(){
const [patients,setPatients]=useState([])
const [selectedPatient,setSelectedPatient]=useState(null)
const [loading,setLoading]=useState(true)
const [search,setSearch]=useState('')
const [showCreate,setShowCreate]=useState(false)
const [showEdit,setShowEdit]=useState(false)
const [activeTab,setActiveTab]=useState('Overview')

async function loadPatients(){
 try{
  setLoading(true)
  const data = await getPatients({search})
  const patientList = data.results || data
  setPatients(patientList)
  if(!selectedPatient && patientList.length > 0){
   setSelectedPatient(patientList[0])
  }
 } finally {
  setLoading(false)
 }
}

useEffect(()=>{
 const timeout = setTimeout(()=>{loadPatients()},300)
 return ()=>clearTimeout(timeout)
}, [search])

return (
<DashboardLayout>
<div className='space-y-6'>
<div className='flex justify-between items-center'>
<div><h1 className='text-3xl font-bold'>Patients</h1><p className='text-gray-500'>Enterprise patient management</p></div>
<div className='flex gap-3'>
<Button onClick={()=>setShowCreate(true)}>+ New Patient</Button>
{selectedPatient && <Button className='bg-gray-700 hover:bg-gray-800' onClick={()=>setShowEdit(true)}>Edit</Button>}
</div>
</div>
<PatientTabs activeTab={activeTab} setActiveTab={setActiveTab} />
<div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
<div className='xl:col-span-1 space-y-4'>
<div className='bg-white rounded-2xl shadow-sm p-4'>
<Input placeholder='Search patients...' value={search} onChange={(e)=>setSearch(e.target.value)} />
</div>
{loading ? <Loader /> : patients.length===0 ? <EmptyState title='No patients found' /> : <PatientTable patients={patients} selectedPatient={selectedPatient} onSelect={setSelectedPatient} />}
</div>
<div className='xl:col-span-2 space-y-4'>
<ClinicalAlerts />
<PatientWorkspace patient={selectedPatient} />
</div>
</div>
</div>
<PatientIntakeModal
  isOpen={showCreate}
  onClose={() => setShowCreate(false)}
  onSuccess={loadPatients}
/>
<PatientEditModal patient={selectedPatient} isOpen={showEdit} onClose={()=>setShowEdit(false)} onUpdated={loadPatients} />
</DashboardLayout>
)
}

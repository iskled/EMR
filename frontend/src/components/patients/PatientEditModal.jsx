import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { updatePatient } from '../../services/patients.service'

export default function PatientEditModal({ patient, isOpen, onClose, onUpdated }) {
const [form, setForm] = useState({ patient_code:'', first_name:'', last_name:'', phone_primary:'' })

useEffect(()=>{
 if(patient){
  setForm({
   patient_code: patient.patient_code || '',
   first_name: patient.first_name || '',
   last_name: patient.last_name || '',
   phone_primary: patient.phone_primary || ''
  })
 }
}, [patient])

async function handleSubmit(e){
 e.preventDefault()
 await updatePatient(patient.id, form)
 await onUpdated()
 onClose()
}

return (
<Modal isOpen={isOpen} onClose={onClose} title='Edit Patient'>
<form onSubmit={handleSubmit} className='space-y-4'>
<Input label='Patient Code' value={form.patient_code} onChange={(e)=>setForm({...form,patient_code:e.target.value})} />
<Input label='First Name' value={form.first_name} onChange={(e)=>setForm({...form,first_name:e.target.value})} />
<Input label='Last Name' value={form.last_name} onChange={(e)=>setForm({...form,last_name:e.target.value})} />
<Input label='Phone' value={form.phone_primary} onChange={(e)=>setForm({...form,phone_primary:e.target.value})} />
<div className='flex justify-end'><Button type='submit'>Save Changes</Button></div>
</form>
</Modal>
)
}

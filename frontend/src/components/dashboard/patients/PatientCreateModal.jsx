import { useState } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { createPatient } from '../../services/patients.service'

export default function PatientCreateModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({ patient_code: '', first_name: '', last_name: '', phone_primary: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    await createPatient(form)
    onCreated()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Create Patient'>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <Input label='Patient Code' value={form.patient_code} onChange={(e) => setForm({ ...form, patient_code: e.target.value })} />
        <Input label='First Name' value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <Input label='Last Name' value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <Input label='Phone' value={form.phone_primary} onChange={(e) => setForm({ ...form, phone_primary: e.target.value })} />
        <Button type='submit'>Save Patient</Button>
      </form>
    </Modal>
  )
}

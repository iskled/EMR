import Tabs from '../ui/Tabs'

export default function PatientTabs({ activeTab, setActiveTab }) {
  return (
    <Tabs tabs={['Overview','Appointments','Clinical','Billing']} activeTab={activeTab} onChange={setActiveTab} />
  )
}

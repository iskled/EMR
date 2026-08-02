const tabs = ['overview', 'appointments', 'clinical', 'orthodontics', 'documents', 'medical-history', 'communications', 'tasks']
export default function PatientTabs({ activeTab, setActiveTab, canViewClinical = false }) {
  return <nav aria-label="Patient workspace" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2">
    {tabs.filter(tab => tab !== 'clinical' || canViewClinical).map(tab => <button key={tab} type="button" onClick={() => setActiveTab(tab)} aria-current={activeTab === tab ? 'page' : undefined} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold capitalize ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{tab}</button>)}
  </nav>
}

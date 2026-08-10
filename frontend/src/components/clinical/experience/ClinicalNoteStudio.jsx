import {useEffect,useState} from 'react'
import {createClinicalNote} from '../../../services/clinical.service'
import {getDentists} from '../../../services/appointments.service'

const initial=()=>({dentist:'',note_type:'treatment',note_date:new Date().toISOString().slice(0,10),chief_complaint:'',clinical_findings:'',diagnosis:'',treatment_planned:'',treatment_performed:'',materials_used:'',anesthesia_type:'',next_visit_instructions:'',notes:'',medical_dental_history:'',family_social_history:'',general_examination:'',orofacial_examination:'',treatment_scope:'whole_mouth',tooth_numbers:[]})
const sections=[
 ['Chief Complaint','What brought the patient in?','chief_complaint',true],
 ['Assessment','Record examination findings','clinical_findings',true],
 ['Diagnosis','Working or confirmed diagnosis','diagnosis',true],
 ['Treatment','Procedure performed today','treatment_performed',true],
 ['Prescription','Medicines, materials or anaesthesia','materials_used',false],
 ['Advice','Aftercare and next-visit instructions','next_visit_instructions',false],
 ['Attachments','Reference records in the Images tab','notes',false],
]

export default function ClinicalNoteStudio({patient,onOpenRecall}){
 const [form,setForm]=useState(initial),[dentists,setDentists]=useState([]),[saving,setSaving]=useState(false),[status,setStatus]=useState('Draft not saved'),[error,setError]=useState('')
 useEffect(()=>{getDentists().then(r=>setDentists(Array.isArray(r)?r:r?.data?.results||r?.data||[])).catch(()=>setDentists([]))},[])
 const update=(name,value)=>{setForm(current=>({...current,[name]:value}));setStatus('Unsaved changes')}
 async function save(e){e.preventDefault();setSaving(true);setError('');try{await createClinicalNote({...form,patient:patient.id});setStatus(`Saved ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`)}catch(err){const data=err?.response?.data;setError(data?.detail||Object.values(data||{}).flat().join(' ')||'Unable to save clinical note.')}finally{setSaving(false)}}
 const input='mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-600 focus:bg-white focus:ring-2 focus:ring-cyan-100'
 return <form onSubmit={save} className="mx-auto max-w-6xl space-y-5 pb-24">
  <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-700">Documentation</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">New clinical note</h1><p className="mt-1 text-sm text-slate-500">Capture the visit without leaving the patient workspace.</p></div><div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">{status}</div></header>
  {error&&<div role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
  <section className="rounded-[2rem] bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-cyan-50 font-bold text-cyan-700">01</span><h2 className="text-lg font-bold">Visit Context</h2></div><div className="mt-5 grid gap-4 md:grid-cols-3">
   <label className="text-sm font-medium">Treating dentist<select name="dentist" className={input} value={form.dentist} onChange={e=>update('dentist',e.target.value)}><option value="">Select dentist</option>{dentists.map(d=><option key={d.id} value={d.id}>{d.name||`${d.first_name||''} ${d.last_name||''}`.trim()||d.email}</option>)}</select></label>
   <label className="text-sm font-medium">Visit date<input className={input} type="date" value={form.note_date} onChange={e=>update('note_date',e.target.value)}/></label>
   <label className="text-sm font-medium">Visit type<select className={input} value={form.note_type} onChange={e=>update('note_type',e.target.value)}><option value="examination">Examination</option><option value="diagnosis">Diagnosis</option><option value="treatment">Treatment</option><option value="follow_up">Follow up</option><option value="general">General</option></select></label>
  </div></section>
  <div className="grid gap-5 lg:grid-cols-2">{sections.map(([title,hint,name,essential],index)=><section key={title} className="rounded-[2rem] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">{String(index+2).padStart(2,'0')}</span><div><h2 className="font-bold text-slate-950">{title}</h2><p className="text-xs text-slate-400">{hint}</p></div></div>{!essential&&<span className="text-xs font-semibold text-slate-400">Optional</span>}</div><textarea aria-label={title} className={input} rows={essential?5:3} value={form[name]} onChange={e=>update(name,e.target.value)}/></section>)}</div>
  <section className="rounded-[2rem] bg-slate-950 p-5 text-white"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-bold">Review</h2><p className="mt-1 text-sm text-slate-300">Confirm the clinical record before saving.</p></div><div className="flex flex-wrap gap-3">{status.startsWith('Saved')&&<button type="button" onClick={onOpenRecall} className="min-h-12 rounded-2xl border border-white/20 px-5 font-semibold hover:bg-white/10">Open Recall</button>}<button type="submit" disabled={saving} className="min-h-12 rounded-2xl bg-cyan-500 px-6 font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-60">{saving?'Saving…':'Save clinical note'}</button></div></div></section>
 </form>
}

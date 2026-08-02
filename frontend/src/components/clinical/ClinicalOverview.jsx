import {useEffect,useState} from 'react'
import {getClinicalNotes,getClinicalImages} from '../../services/clinical.service'
import {getTreatmentPlans} from '../../services/treatmentPlanService'
import {getAppointments,getReminders} from '../../services/appointments.service'
import {getToothChart} from '../../services/toothChartService'

export default function ClinicalOverview({patient,orthoCase,onNavigate}){
 const [state,setState]=useState({loading:true,error:false,notes:[],plans:[],images:[],appointments:[],recalls:[],teeth:[]})
 useEffect(()=>{let active=true;setState(s=>({...s,loading:true,error:false}));Promise.all([
  getClinicalNotes(patient.id),getTreatmentPlans(patient.id),getClinicalImages(patient.id),
  getAppointments({patient:patient.id,ordering:'scheduled_date'}),getReminders({patient:patient.id,ordering:'due_date'}),getToothChart(patient.id),
 ]).then(([n,p,i,a,r,c])=>{if(active)setState({loading:false,error:false,notes:n.data?.results||n.data||[],plans:p?.results||p||[],images:i.data?.results||i.data||[],appointments:a||[],recalls:r.results||r||[],teeth:c?.results?.[0]?.teeth||[]})}).catch(()=>active&&setState(s=>({...s,loading:false,error:true})));return()=>{active=false}},[patient.id])
 if(state.loading)return <div className="rounded-xl bg-white p-8 text-slate-500">Loading clinical summary…</div>
 if(state.error)return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">Clinical summary is temporarily unavailable.</div>
 const note=state.notes[0],appointment=state.appointments.find(item=>!['completed','cancelled','no_show'].includes(item.status)),recall=state.recalls.find(item=>!['completed','cancelled'].includes(item.status)),findings=state.teeth.filter(t=>t.condition!=='healthy'||Object.keys(t.surface_conditions||{}).length||t.notes)
 const cards=[['Last Clinical Note',note?`${note.note_date} · ${note.note_type}`:'No clinical notes recorded.'],['Active Dental Conditions',`${findings.length} teeth with recorded findings`],['Current Treatment',`${state.plans.filter(p=>!['completed','declined'].includes(p.status)).length} active treatment plans`],['Last Treating Dentist',note?.dentist_name||note?.other_dentist_name||'Not recorded'],['Next Appointment',appointment?`${appointment.scheduled_date} ${appointment.start_time}`:'No upcoming appointment'],['Active Recall',recall?`${recall.reminder_type_label} · ${recall.due_date}`:'No active recall'],['Medical Alerts',(patient.medical_alerts||patient.allergies||'No recorded allergies')],['Recent Images or Documents',`${state.images.length} clinical images`],['Orthodontics',orthoCase?`${orthoCase.status} · ${orthoCase.stage}`:'No orthodontic case.']]
 return <div className="space-y-4"><div className="flex flex-wrap gap-2">{[['chart','Open Chart'],['note','Create Clinical Note'],['recall','Open Recall'],['timeline','View Timeline']].map(([tab,label])=><button key={tab} onClick={()=>onNavigate(tab)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">{label}</button>)}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(([title,value])=><article key={title} className="rounded-xl border bg-white p-5"><h3 className="text-sm font-bold text-slate-600">{title}</h3><p className="mt-2 font-semibold">{value}</p></article>)}</div></div>
}

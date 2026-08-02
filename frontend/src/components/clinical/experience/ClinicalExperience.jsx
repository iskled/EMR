import {lazy,Suspense,useCallback,useEffect,useState} from 'react'
import ExperienceNav,{EXPERIENCE_TABS} from './ExperienceNav'
import DentalCanvas,{ODONTOGRAM_LAYOUT,toothNumber} from './DentalCanvas'
import FindingInspector from './FindingInspector'
import OdontogramLegend from './OdontogramLegend'
import ClinicalNoteStudio from './ClinicalNoteStudio'
import {getToothChart} from '../../../services/toothChartService'

const Overview=lazy(()=>import('../ClinicalOverview')),Recall=lazy(()=>import('../ClinicalRecall')),Images=lazy(()=>import('../ClinicalImageGallery')),Timeline=lazy(()=>import('../ClinicalTimeline'))
const loading=<div className="grid min-h-72 place-items-center rounded-[2rem] bg-white text-sm font-semibold text-slate-400">Loading clinical workspace…</div>

export default function ClinicalExperience({patient,orthoCase,activeTab='overview',onTabChange}){
 const allowed=EXPERIENCE_TABS.map(([value])=>value),tab=allowed.includes(activeTab)?activeTab:'overview'
 const [chart,setChart]=useState(null),[chartState,setChartState]=useState('idle'),[teeth,setTeeth]=useState([]),[surface,setSurface]=useState(null),[showFindings,setShowFindings]=useState(true)
 const loadChart=useCallback(async(silent=false)=>{if(tab!=='chart')return;if(!silent)setChartState('loading');try{setChart(await getToothChart(patient.id));setChartState('ready')}catch{setChartState('error')}},[patient.id,tab])
 useEffect(()=>{loadChart()},[loadChart])
 useEffect(()=>{setTeeth([]);setSurface(null);setChart(null)},[patient.id])
 const chartTeeth=chart?.results?.[0]?.teeth||[],activeTooth=surface?.tooth||teeth[teeth.length-1]
 const record=activeTooth?chartTeeth.find(item=>item.tooth_number===toothNumber[activeTooth]):null
 const selectedData=teeth.map(code=>chartTeeth.find(item=>item.tooth_number===toothNumber[code])).filter(Boolean)
 function selectTooth(value,modifiers={}){
  setTeeth(current=>{
   if(modifiers.shiftKey&&current.length){
    const order=ODONTOGRAM_LAYOUT.map(item=>item.code),start=order.indexOf(current[current.length-1]),end=order.indexOf(value)
    const range=order.slice(Math.min(start,end),Math.max(start,end)+1)
    return [...current,...range.filter(code=>!current.includes(code))]
   }
   return current.includes(value)?current.filter(code=>code!==value):[...current,value]
  })
  setSurface(current=>current?.tooth===value?null:current)
 }
 function selectSurface(value){setTeeth(current=>current.includes(value.tooth)?current:[...current,value.tooth]);setSurface(value)}
 let content
 if(tab==='overview')content=<Overview patient={patient} orthoCase={orthoCase} onNavigate={onTabChange}/>
 else if(tab==='note')content=<ClinicalNoteStudio patient={patient} onOpenRecall={()=>onTabChange('recall')}/>
 else if(tab==='recall')content=<Recall patient={patient}/>
 else if(tab==='images')content=<Images patient={patient}/>
 else if(tab==='timeline')content=<Timeline patient={patient}/>
 else content=<div className="space-y-4">
  <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-700">Interactive chart</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Odontogram</h1><p className="mt-1 text-sm text-slate-500">Open-mouth clinical view · select one or multiple teeth.</p></div><div className="flex items-center gap-2"><button type="button" onClick={()=>{setTeeth([]);setSurface(null)}} className="min-h-11 rounded-full px-4 text-sm font-semibold text-slate-600 hover:bg-white">Clear Selection</button><button type="button" aria-pressed={showFindings} onClick={()=>setShowFindings(value=>!value)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${showFindings?'bg-cyan-100 text-cyan-800':'bg-white text-slate-600'}`}>Show Findings</button><OdontogramLegend/></div></div>
  {chartState==='loading'?loading:chartState==='error'?<div role="alert" className="rounded-2xl bg-red-50 p-5 text-red-700">The chart could not be loaded. <button className="font-bold underline" onClick={loadChart}>Retry</button></div>:<div data-testid="odontogram-desktop-layout" className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]"><DentalCanvas chart={chart} selectedTeeth={teeth} selectedSurface={surface} onTooth={selectTooth} onSurface={selectSurface} showFindings={showFindings}/><div className="lg:sticky lg:top-4 lg:self-start"><FindingInspector selection={teeth} surface={surface} toothData={record} selectedData={selectedData} chartId={chart?.results?.[0]?.id} onSaved={()=>loadChart(true)} onClear={()=>{setTeeth([]);setSurface(null)}}/></div></div>}
 </div>
 return <section className="min-w-0 rounded-[2.25rem] bg-[#f4f7f8] p-3 sm:p-5"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-slate-400">Clinical workspace</p><p className="mt-1 font-semibold text-slate-700">{patient.first_name} {patient.last_name} <span className="font-normal text-slate-400">· {patient.patient_code}</span></p></div><ExperienceNav active={tab} onChange={onTabChange}/></div><Suspense fallback={loading}>{content}</Suspense></section>
}

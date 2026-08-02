import {useEffect,useState} from 'react'
import {updateTooth} from '../../../services/toothChartService'
import {conditionStyle,surfaceStyle} from './odontogramConditionStyles'

const clean={condition:'healthy',mobility_grade:0,pocket_depth:0,furcation:'',notes:''}
const surfaceOptions=[['','Whole tooth'],['B','Buccal'],['M','Mesial'],['O','Occlusal'],['D','Distal'],['L','Lingual']]
const pocket=value=>typeof value==='object'&&value?Number(value.general??value.B??value.O??0)||0:Number(value)||0

export default function FindingInspector({selection=[],surface,toothData,selectedData=[],chartId,onSaved,onClear}){
 const selected=Array.isArray(selection)?selection:selection?[selection]:[]
 const multiple=selected.length>1
 const activeStyle=surface?surfaceStyle(toothData?.surface_conditions?.[surface.surface]):conditionStyle(toothData?.condition)
 const [form,setForm]=useState(clean),[surfaceCondition,setSurfaceCondition]=useState('sound')
 const [bulkSurface,setBulkSurface]=useState(''),[confirming,setConfirming]=useState(false),[state,setState]=useState('idle')
 useEffect(()=>{
  setForm({condition:toothData?.condition||'healthy',mobility_grade:toothData?.mobility_grade||0,pocket_depth:pocket(toothData?.pocket_depth),furcation:toothData?.furcation||'',notes:toothData?.notes||''})
  setConfirming(false)
 },[selected.join('|'),toothData])
 useEffect(()=>setState('idle'),[selected.join('|')])
 useEffect(()=>setSurfaceCondition(surface?toothData?.surface_conditions?.[surface.surface]||'sound':'sound'),[surface,toothData])
 if(!selected.length)return <aside data-testid="clinical-context" className="flex min-h-72 items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-7 text-center"><div><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-cyan-50 text-2xl text-cyan-700">✦</div><h2 className="font-bold text-slate-900">Choose a tooth</h2><p className="mt-2 max-w-52 text-sm text-slate-500">Findings and surfaces will remain here while you select.</p></div></aside>
 const change=(key,value)=>{setForm(current=>({...current,[key]:value}));setConfirming(false);setState('idle')}
 async function saveSingle(){
  const surfaces={...(toothData?.surface_conditions||{})}
  if(surface)surfaces[surface.surface]=surfaceCondition
  const oldPocket=toothData?.pocket_depth&&typeof toothData.pocket_depth==='object'?toothData.pocket_depth:{}
  await updateTooth(chartId,toothData.tooth_number,{...form,pocket_depth:{...oldPocket,general:Number(form.pocket_depth)},surface_conditions:surfaces})
 }
 async function saveBulk(){
  await Promise.all(selectedData.map(record=>{
   const payload={condition:form.condition}
   if(bulkSurface)payload.surface_conditions={...(record?.surface_conditions||{}),[bulkSurface]:surfaceCondition}
   return updateTooth(chartId,record.tooth_number,payload)
  }))
 }
 async function save(){
  if(multiple&&!confirming){setConfirming(true);return}
  setState('saving')
  try{if(multiple)await saveBulk();else await saveSingle();await onSaved();setState('saved');setConfirming(false)}
  catch{setState('error')}
 }
 const field='mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600 focus:bg-white focus:ring-2 focus:ring-cyan-100'
 return <aside data-testid="clinical-context" className="rounded-[2rem] bg-white p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,.4)]">
  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-700">{multiple?'Selected teeth':'Selected tooth'}</p>{multiple?<><h2 className="mt-1 text-xl font-bold">Selected: {selected.length} teeth</h2><div className="mt-2 flex flex-wrap gap-1.5" aria-label="Affected teeth">{selected.map(code=><span key={code} className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800">{code}</span>)}</div></>:<><h2 className="mt-1 text-3xl font-bold">{selected[0]}</h2><p className="text-sm text-slate-500">FDI {toothData?.tooth_number}</p></>}</div><button type="button" onClick={onClear} className="min-h-11 rounded-full px-3 text-sm font-semibold text-slate-500 hover:bg-slate-100">Clear</button></div>
  <div data-testid="context-condition-badge" className="mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold" style={{borderColor:activeStyle.stroke,backgroundColor:activeStyle.color}}><span aria-hidden="true">{activeStyle.symbol||'●'}</span>{activeStyle.label}</div>
  <div className="mt-5 space-y-3">
   <details open className="rounded-2xl bg-slate-50 p-4"><summary className="cursor-pointer font-semibold">Findings</summary><div className="mt-3 grid gap-3">
    {multiple&&<p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Bulk actions</p>}
    <label className="text-sm">Condition<select aria-label={multiple?'Bulk condition':'Condition'} className={field} value={form.condition} onChange={event=>change('condition',event.target.value)}><option value="healthy">Healthy</option><option value="caries">Caries</option><option value="filled">Filled</option><option value="crown">Crown</option><option value="missing">Missing</option><option value="implant">Implant</option><option value="bridge_anchor">Bridge Anchor</option><option value="bridge_pontic">Bridge Pontic</option><option value="rct">Root Canal Treated</option><option value="fractured">Fractured</option><option value="impacted">Impacted</option><option value="extracted">Extracted</option><option value="watch">Watch</option></select></label>
    {multiple&&<label className="text-sm">Surface<select aria-label="Bulk surface" className={field} value={bulkSurface} onChange={event=>{setBulkSurface(event.target.value);setConfirming(false)}}>{surfaceOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
    {(surface||multiple&&bulkSurface)&&<label className="text-sm">Surface finding<select aria-label="Surface finding" className={field} value={surfaceCondition} onChange={event=>{setSurfaceCondition(event.target.value);setConfirming(false)}}><option value="sound">Sound</option><option value="caries">Caries</option><option value="filled_composite">Composite</option><option value="filled_amalgam">Amalgam</option><option value="filled_ceramic">Ceramic</option><option value="watch">Watch</option><option value="sealant">Sealant</option><option value="worn">Worn</option></select></label>}
   </div></details>
   {!multiple&&<details className="rounded-2xl bg-slate-50 p-4"><summary className="cursor-pointer font-semibold">Periodontal</summary><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-sm">Mobility<input className={field} type="number" min="0" max="3" value={form.mobility_grade} onChange={event=>change('mobility_grade',Number(event.target.value))}/></label><label className="text-sm">Pocket depth<input className={field} type="number" min="0" max="20" value={form.pocket_depth} onChange={event=>change('pocket_depth',Number(event.target.value))}/></label><label className="col-span-2 text-sm">Furcation<select className={field} value={form.furcation} onChange={event=>change('furcation',event.target.value)}><option value="">None</option><option value="I">Class I</option><option value="II">Class II</option><option value="III">Class III</option></select></label></div></details>}
   {!multiple&&<details className="rounded-2xl bg-slate-50 p-4"><summary className="cursor-pointer font-semibold">Notes</summary><textarea aria-label="Notes" className={field} rows="4" value={form.notes} onChange={event=>change('notes',event.target.value)}/></details>}
  </div>
  {multiple&&confirming&&<div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-amber-950">Confirm bulk update</p><p className="mt-1 text-sm text-amber-800">Affected Teeth: {selected.join(', ')}</p><p className="mt-1 text-sm text-amber-800">Only these {selected.length} tooth records will be updated.</p></div>}
  <button type="button" disabled={state==='saving'} onClick={save} className="mt-5 min-h-12 w-full rounded-2xl bg-slate-950 px-4 font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60">{state==='saving'?'Saving…':multiple?(confirming?`Confirm — Apply to ${selected.length} teeth`:`Apply to ${selected.length} teeth`):'Save finding'}</button>
  {state!=='idle'&&state!=='saving'&&<p role="status" className={`mt-3 text-center text-sm font-semibold ${state==='saved'?'text-emerald-700':'text-red-700'}`}>{state==='saved'?(multiple?'Bulk findings saved':'Finding saved'):'Unable to save finding'}</p>}
 </aside>
}

import { useEffect, useRef, useState } from 'react'
import AssignmentPanel from './AssignmentPanel'
import ChecklistPanel from './ChecklistPanel'
import DependencyPanel from './DependencyPanel'
import TaskActivityTimeline from './TaskActivityTimeline'
import TaskComments from './TaskComments'

export const TASK_PATH = [
  ['pending_acceptance', 'Pending Acceptance', 0], ['accepted', 'Accepted', 25],
  ['in_progress', 'In Progress', 50], ['waiting_for_vendor', 'Waiting for Vendor', 50],
  ['waiting_for_staff', 'Waiting for Staff', 50], ['resolved', 'Resolved', 90], ['closed', 'Closed', 100],
]
export const TRANSITIONS = {
  pending_acceptance: ['accepted'], accepted: ['in_progress'],
  in_progress: ['accepted', 'waiting_for_vendor', 'waiting_for_staff', 'resolved'],
  waiting_for_vendor: ['in_progress', 'waiting_for_staff', 'resolved'],
  waiting_for_staff: ['in_progress', 'waiting_for_vendor', 'resolved'],
  resolved: ['closed', 'in_progress', 'waiting_for_vendor', 'waiting_for_staff'], closed: ['resolved'],
}
const REVERSES = new Set(['in_progress:accepted', 'waiting_for_vendor:in_progress', 'waiting_for_staff:in_progress', 'resolved:in_progress', 'resolved:waiting_for_vendor', 'resolved:waiting_for_staff', 'closed:resolved'])
const labelFor = stage => TASK_PATH.find(([value]) => value === stage)?.[1] || stage?.replaceAll('_', ' ') || ''
const percentFor = stage => TASK_PATH.find(([value]) => value === stage)?.[2] ?? 0

export function TaskProgressPath({ task, interactive, onSelect }) {
  const currentIndex = TASK_PATH.findIndex(([stage]) => stage === task.status)
  const currentRef = useRef(null)
  useEffect(() => { if (typeof currentRef.current?.scrollIntoView === 'function') currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }) }, [task.status])
  return <div className="overflow-x-auto pb-2" aria-label="Task stage progress path">
    <ol className="flex min-w-max" role="list">
      {TASK_PATH.map(([stage, label, percentage], index) => {
        const current = stage === task.status
        const complete = index < currentIndex
        const enabled = interactive && (TRANSITIONS[task.status] || []).includes(stage)
        const waiting = current && stage.startsWith('waiting_')
        const state = current ? 'current stage' : complete ? 'completed stage' : 'future stage'
        const reason = enabled ? '' : current ? 'This is the current stage' : 'Transition unavailable from the current stage'
        return <li key={stage} className="-ml-px first:ml-0">
          <button ref={current ? currentRef : null} type="button" disabled={!enabled} onClick={() => enabled && onSelect(stage)}
            aria-current={current ? 'step' : undefined} aria-label={`${label}, ${state}, ${percentage} percent complete${enabled ? ', clickable' : `, unavailable: ${reason}`}`}
            title={reason} className={`relative min-h-14 w-40 border px-5 py-2 text-sm font-semibold focus:z-10 focus:outline-none focus:ring-4 focus:ring-blue-300 ${index ? '[clip-path:polygon(0_0,calc(100%-14px)_0,100%_50%,calc(100%-14px)_100%,0_100%,14px_50%)] pl-7' : '[clip-path:polygon(0_0,calc(100%-14px)_0,100%_50%,calc(100%-14px)_100%,0_100%)]'} ${waiting ? 'border-amber-700 bg-amber-500 text-gray-950' : current ? 'border-blue-800 bg-blue-700 text-white' : complete ? 'border-green-700 bg-green-600 text-white' : enabled ? 'border-gray-400 bg-gray-100 text-gray-900 hover:bg-blue-50' : 'border-gray-300 bg-gray-100 text-gray-500'}`}>
            <span aria-hidden="true">{complete ? '✓ ' : ''}</span>{label}
          </button>
        </li>
      })}
    </ol>
  </div>
}

function StageDialog({ task, target, onCancel, onTransition }) {
  const [note, setNote] = useState(''); const [reason, setReason] = useState(''); const [error, setError] = useState('')
  const reverse = REVERSES.has(`${task.status}:${target}`)
  const noteRequired = reverse || ['waiting_for_vendor', 'waiting_for_staff', 'resolved', 'closed'].includes(target)
  async function submit(event) {
    event.preventDefault(); setError('')
    if (noteRequired && !note.trim()) return setError('A progress note is required.')
    if (reverse && !reason.trim()) return setError('A reversal reason is required.')
    await onTransition(task, { stage: target, note: note.trim(), reason: reason.trim() }); onCancel()
  }
  return <form onSubmit={submit} role="dialog" aria-labelledby="stage-dialog-title" className="rounded-lg border border-blue-200 bg-blue-50 p-4">
    <h3 id="stage-dialog-title" className="text-lg font-semibold">Change task stage</h3>
    <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2"><p><b>Current:</b><br />{labelFor(task.status)} — {task.progress_percentage}%</p><p><b>New:</b><br />{labelFor(target)} — {percentFor(target)}%</p></div>
    <label htmlFor="stage-note" className="mt-3 block text-sm font-semibold">Progress note{noteRequired ? ' *' : ''}</label>
    <textarea id="stage-note" value={note} onChange={e => setNote(e.target.value)} className="mt-1 min-h-20 w-full rounded-md border p-2" />
    {reverse && <><label htmlFor="stage-reason" className="mt-3 block text-sm font-semibold">Reversal reason *</label><input id="stage-reason" value={reason} onChange={e => setReason(e.target.value)} className="mt-1 w-full rounded-md border p-2" /></>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    <div className="mt-3 flex gap-2"><button className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Change Stage</button><button type="button" onClick={onCancel} className="rounded-md border bg-white px-3 py-2 text-sm">Cancel</button></div>
  </form>
}

function NoteForm({ task, onProgressUpdate }) {
  const [note, setNote] = useState('')
  return <form onSubmit={async e => { e.preventDefault(); if (!note.trim()) return; await onProgressUpdate(task, { note: note.trim() }); setNote('') }} className="mt-3 rounded-md bg-gray-50 p-3">
    <label htmlFor="progress-note" className="text-sm font-semibold">Add progress note</label><textarea id="progress-note" required value={note} onChange={e => setNote(e.target.value)} className="mt-1 min-h-20 w-full rounded-md border p-2" />
    <button className="mt-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Add Note</button>
  </form>
}

export default function TaskDrawer({ task, tasks, staff, templates, onClose, onEdit, onAccept, onDecline, onProgressUpdate, onDelete, onReassign, onChecklistToggle, onApplyTemplate, onComment, onDependencyCreate, onDependencyDelete, onTransition, canAssign=false, canDelete=false }) {
  const [target, setTarget] = useState(null); const [declining, setDeclining] = useState(false); const [declineReason, setDeclineReason] = useState(''); const [announcement, setAnnouncement] = useState('')
  if (!task) return null
  const progress = task.progress_percentage ?? percentFor(task.status)
  async function transition(current, payload) { await onTransition(current, payload); setAnnouncement(`Task stage changed to ${labelFor(payload.stage)}, ${percentFor(payload.stage)} percent complete`) }
  return <div className="fixed inset-0 z-40 flex justify-end bg-black/30"><aside className="h-full w-full max-w-5xl overflow-y-auto bg-gray-50 p-5 shadow-xl">
    <p className="sr-only" aria-live="polite">{announcement}</p>
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">{task.title}</h2><p className="text-sm text-gray-600">{labelFor(task.status)}</p></div><div className="flex gap-2">{canAssign && <button onClick={() => onEdit(task)} className="rounded border bg-white px-3 py-2">Edit</button>}{canDelete && <button onClick={() => onDelete(task)} className="rounded border border-red-300 bg-white px-3 py-2 text-red-700">Delete</button>}<button onClick={onClose} className="rounded border bg-white px-3 py-2">Close</button></div></div>
    <section className="mt-4 rounded-lg border bg-white p-4"><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Task Progress: {progress}%</h3><span>{labelFor(task.status)}</span></div><div role="progressbar" aria-label="Task progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress} className="mb-4 h-3 rounded-full bg-gray-200"><div className="h-3 rounded-full bg-blue-700" style={{width:`${progress}%`}} /></div><TaskProgressPath task={task} interactive={!canAssign && task.status !== 'pending_acceptance'} onSelect={setTarget} />
      {!canAssign && task.status === 'pending_acceptance' && <div className="mt-4 flex gap-2"><button onClick={() => onAccept(task)} className="rounded bg-blue-700 px-3 py-2 font-semibold text-white">Accept Task</button><button onClick={() => setDeclining(true)} className="rounded border border-red-300 px-3 py-2 text-red-700">Decline Task</button></div>}
    </section>
    <div className="mt-4 space-y-4">{target && <StageDialog task={task} target={target} onCancel={() => setTarget(null)} onTransition={transition} />}{declining && <form onSubmit={async e => {e.preventDefault(); await onDecline(task,{reason:declineReason}); setDeclining(false)}} className="rounded-lg border bg-white p-4"><label htmlFor="decline-reason" className="font-semibold">Decline reason *</label><textarea id="decline-reason" required value={declineReason} onChange={e=>setDeclineReason(e.target.value)} className="mt-2 min-h-20 w-full rounded border p-2"/><div className="mt-2 flex gap-2"><button className="rounded bg-red-700 px-3 py-2 text-white">Decline Task</button><button type="button" onClick={()=>setDeclining(false)}>Cancel</button></div></form>}
      <section className="rounded-lg border bg-white p-4"><p>{task.description || 'No description.'}</p><div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4"><div>Priority<br/><b>{task.priority}</b></div><div>Due<br/><b>{task.due_date || '-'}</b></div><div>Assignee<br/><b>{task.assigned_user_name || '-'}</b></div><div>Latest update<br/><b>{task.latest_progress_summary || '-'}</b></div></div></section>
      {canAssign && <AssignmentPanel task={task} staff={staff} onReassign={onReassign} />}
      <section className="rounded-lg border bg-white p-4"><h3 className="text-lg font-semibold">Task History</h3>{!canAssign && task.status !== 'pending_acceptance' && <NoteForm task={task} onProgressUpdate={onProgressUpdate}/>}<div className="mt-4 space-y-3">{(task.progress_updates||[]).map(update=><article key={update.id} className="rounded border p-3 text-sm"><div className="flex justify-between"><b>{update.created_by_name || 'Unknown user'} ({update.created_by_role || 'unknown role'})</b><span>{new Date(update.created_at).toLocaleString()}</span></div><p className="mt-1">{update.note}</p>{update.previous_stage && <p className="mt-1 text-blue-800">{labelFor(update.previous_stage)} ({update.previous_percentage ?? '—'}%) → {labelFor(update.new_stage)} ({update.new_percentage ?? update.percentage}%)</p>}{update.reason && <p>Reason: {update.reason}</p>}</article>)}</div></section>
      {canAssign && <ChecklistPanel task={task} templates={templates} onToggle={onChecklistToggle} onApplyTemplate={onApplyTemplate}/>}<DependencyPanel task={task} tasks={tasks} onCreate={onDependencyCreate} onDelete={onDependencyDelete}/><TaskComments task={task} onAdd={onComment}/><TaskActivityTimeline task={task}/>
    </div>
  </aside></div>
}

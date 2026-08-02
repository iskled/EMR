import { useState } from 'react'
import AssignmentPanel from './AssignmentPanel'
import ChecklistPanel from './ChecklistPanel'
import DependencyPanel from './DependencyPanel'
import TaskActivityTimeline from './TaskActivityTimeline'
import TaskComments from './TaskComments'

const allowedUploadTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const maxUploadSize = 10 * 1024 * 1024

function formatStatus(value) {
  return value ? value.replaceAll('_', ' ') : ''
}

function formatBytes(value = 0) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function ProgressForm({ task, onProgressUpdate }) {
  const [note, setNote] = useState('')
  const [percentage, setPercentage] = useState(task.progress_percentage ?? '')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!note.trim()) {
      setError('Progress note is required.')
      return
    }
    const numeric = percentage === '' ? null : Number(percentage)
    if (numeric !== null && (numeric < 0 || numeric > 100)) {
      setError('Progress percentage must be between 0 and 100.')
      return
    }
    await onProgressUpdate(task, { note, percentage: numeric })
    setNote('')
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <label htmlFor="task-progress-note" className="block text-sm font-semibold text-gray-800">Progress Note</label>
      <textarea id="task-progress-note" value={note} onChange={event => setNote(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <label htmlFor="task-progress-percentage" className="mt-3 block text-sm font-semibold text-gray-800">Percentage Complete</label>
      <input id="task-progress-percentage" type="number" min="0" max="100" value={percentage} onChange={event => setPercentage(event.target.value)} className="mt-1 w-32 rounded-md border border-gray-300 px-3 py-2 text-sm" />
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <button type="submit" className="mt-3 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Add Progress Update</button>
    </form>
  )
}

function AttachmentForm({ task, onAttachmentUpload }) {
  const [file, setFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')

  function chooseFile(event) {
    const selected = event.target.files?.[0]
    setError('')
    setFile(null)
    if (!selected) return
    if (!allowedUploadTypes.includes(selected.type)) {
      setError('Upload JPEG, PNG, WebP, or PDF files only.')
      return
    }
    if (selected.size > maxUploadSize) {
      setError('Attachment exceeds the maximum allowed size of 10 MB.')
      return
    }
    setFile(selected)
  }

  async function submit(event) {
    event.preventDefault()
    if (!file) {
      setError('Choose a file before uploading.')
      return
    }
    await onAttachmentUpload(task, { file, caption, title: caption || file.name })
    setFile(null)
    setCaption('')
    event.target.reset()
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <label htmlFor="task-attachment-file" className="block text-sm font-semibold text-gray-800">Upload Attachment</label>
      <input id="task-attachment-file" type="file" accept={allowedUploadTypes.join(',')} onChange={chooseFile} className="mt-1 block w-full text-sm" />
      {file && (
        <div className="mt-2 rounded-md border border-gray-200 bg-white p-2 text-sm">
          <p className="font-semibold text-gray-900">{file.name}</p>
          <p className="text-xs text-gray-500">{file.type} - {formatBytes(file.size)}</p>
          {file.type.startsWith('image/') && <img src={URL.createObjectURL(file)} alt="" className="mt-2 h-24 w-24 rounded object-cover" />}
        </div>
      )}
      <label htmlFor="task-attachment-caption" className="mt-3 block text-sm font-semibold text-gray-800">Caption</label>
      <input id="task-attachment-caption" value={caption} onChange={event => setCaption(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <button type="submit" className="mt-3 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Upload Attachment</button>
    </form>
  )
}

function WorkflowActionForm({ mode, task, onCancel, onWaiting, onBlocked, onComplete, onDecline }) {
  const [reason, setReason] = useState('')
  const [percentage, setPercentage] = useState(task.progress_percentage ?? '')
  const [error, setError] = useState('')

  const config = {
    waiting: {
      title: 'Mark Waiting',
      label: 'Waiting Reason',
      action: payload => onWaiting(task, payload),
      buttonClass: 'bg-amber-600 hover:bg-amber-700',
    },
    blocked: {
      title: 'Mark Blocked',
      label: 'Blocking Reason',
      action: payload => onBlocked(task, payload),
      buttonClass: 'bg-red-600 hover:bg-red-700',
    },
    complete: {
      title: 'Complete Task',
      label: 'Completion Summary',
      action: payload => onComplete(task, { summary: payload.reason }),
      buttonClass: 'bg-green-600 hover:bg-green-700',
    },
    decline: {
      title: 'Decline Task',
      label: 'Decline Reason',
      action: payload => onDecline(task, payload),
      buttonClass: 'bg-red-600 hover:bg-red-700',
    },
  }[mode]

  if (!config) return null

  async function submit(event) {
    event.preventDefault()
    setError('')
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setError(`${config.label} is required.`)
      return
    }
    const numeric = percentage === '' || ['complete', 'decline'].includes(mode) ? null : Number(percentage)
    if (numeric !== null && (numeric < 0 || numeric > 100)) {
      setError('Progress percentage must be between 0 and 100.')
      return
    }
    await config.action({ reason: trimmedReason, percentage: numeric })
    setReason('')
    onCancel()
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
        <button type="button" onClick={onCancel} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700">Cancel</button>
      </div>
      <label htmlFor={`task-workflow-${mode}-reason`} className="mt-3 block text-sm font-semibold text-gray-800">{config.label}</label>
      <textarea
        id={`task-workflow-${mode}-reason`}
        value={reason}
        onChange={event => setReason(event.target.value)}
        className="mt-1 min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {['waiting', 'blocked'].includes(mode) && (
        <>
          <label htmlFor={`task-workflow-${mode}-percentage`} className="mt-3 block text-sm font-semibold text-gray-800">Percentage Complete</label>
          <input
            id={`task-workflow-${mode}-percentage`}
            type="number"
            min="0"
            max="100"
            value={percentage}
            onChange={event => setPercentage(event.target.value)}
            className="mt-1 w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <button type="submit" className={`mt-3 rounded-md px-3 py-2 text-sm font-semibold text-white ${config.buttonClass}`}>{config.title}</button>
    </form>
  )
}

const STAGE_ACTIONS = {
  accepted: [['in_progress', 'Start Work']],
  in_progress: [['waiting_for_vendor', 'Waiting for Vendor'], ['waiting_for_staff', 'Waiting for Staff'], ['resolved', 'Mark Resolved'], ['accepted', 'Return to Accepted']],
  waiting_for_vendor: [['in_progress', 'Resume In Progress'], ['waiting_for_staff', 'Waiting for Staff'], ['resolved', 'Mark Resolved']],
  waiting_for_staff: [['in_progress', 'Resume In Progress'], ['waiting_for_vendor', 'Waiting for Vendor'], ['resolved', 'Mark Resolved']],
  resolved: [['closed', 'Close Task'], ['in_progress', 'Reopen as In Progress'], ['waiting_for_vendor', 'Return to Waiting for Vendor'], ['waiting_for_staff', 'Return to Waiting for Staff']],
  closed: [['resolved', 'Reopen as Resolved']],
}

const REVERSE_ACTIONS = new Set(['in_progress:accepted', 'waiting_for_vendor:in_progress', 'waiting_for_staff:in_progress', 'resolved:in_progress', 'resolved:waiting_for_vendor', 'resolved:waiting_for_staff', 'closed:resolved'])

function StageChangeForm({ task, target, label, onCancel, onTransition }) {
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const reverse = REVERSE_ACTIONS.has(`${task.status}:${target}`)
  const noteRequired = reverse || ['waiting_for_vendor', 'waiting_for_staff', 'resolved', 'closed'].includes(target)
  async function submit(event) {
    event.preventDefault()
    if (noteRequired && !note.trim()) return setError('A progress note is required.')
    if (reverse && !reason.trim()) return setError('A reversal reason is required.')
    await onTransition(task, { stage: target, note: note.trim(), reason: reason.trim() })
    onCancel()
  }
  return <form onSubmit={submit} className="rounded-lg border border-blue-200 bg-blue-50 p-4">
    <h3 className="font-semibold text-gray-900">{label}</h3>
    <label className="mt-3 block text-sm font-semibold" htmlFor="stage-note">Progress note{noteRequired ? ' *' : ''}</label>
    <textarea id="stage-note" value={note} onChange={event => setNote(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-gray-300 p-2" />
    {reverse && <><label className="mt-3 block text-sm font-semibold" htmlFor="stage-reason">Reversal reason *</label><input id="stage-reason" value={reason} onChange={event => setReason(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 p-2" /></>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    <div className="mt-3 flex gap-2"><button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Confirm</button><button type="button" onClick={onCancel} className="rounded-md border px-3 py-2 text-sm">Cancel</button></div>
  </form>
}

export default function TaskDrawer({
  task,
  tasks,
  staff,
  templates,
  onClose,
  onEdit,
  onAccept,
  onDecline,
  onStartWork,
  onWaiting,
  onBlocked,
  onResume,
  onProgressUpdate,
  onAttachmentUpload,
  onComplete,
  onDelete,
  onReassign,
  onChecklistToggle,
  onApplyTemplate,
  onComment,
  onDependencyCreate,
  onDependencyDelete,
  onTransition,
  canAssign = false,
  canDelete = false,
}) {
  const [workflowMode, setWorkflowMode] = useState(null)

  if (!task) return null

  const progress = task.progress_percentage ?? 0

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
      <aside className="h-full w-full max-w-5xl overflow-y-auto bg-gray-50 p-5 shadow-xl">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
            <p className="mt-1 text-sm capitalize text-gray-600">{task.task_type.replaceAll('_', ' ')} - {formatStatus(task.status)}</p>
            <div className="mt-3 h-2 w-72 rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">{progress}% complete</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!canAssign && task.status === 'pending_acceptance' && (
              <>
                <button type="button" onClick={() => onAccept(task)} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Accept Task</button>
                <button type="button" onClick={() => setWorkflowMode('decline')} className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700">Decline Task</button>
              </>
            )}
            {!canAssign && (STAGE_ACTIONS[task.status] || []).map(([target, label]) => <button key={target} type="button" onClick={() => setWorkflowMode({ target, label })} className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700">{label}</button>)}
            {canAssign && <button type="button" onClick={() => onEdit(task)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700">Edit</button>}
            {canDelete && <button type="button" onClick={() => onDelete(task)} className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700">Delete</button>}
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700">Close</button>
          </div>
        </div>

        <div className="space-y-4">
          {workflowMode && typeof workflowMode === 'object' && <StageChangeForm task={task} target={workflowMode.target} label={workflowMode.label} onCancel={() => setWorkflowMode(null)} onTransition={onTransition} />}
          {workflowMode && typeof workflowMode === 'string' && (
            <WorkflowActionForm
              mode={workflowMode}
              task={task}
              onCancel={() => setWorkflowMode(null)}
              onWaiting={onWaiting}
              onBlocked={onBlocked}
              onComplete={onComplete}
              onDecline={onDecline}
            />
          )}

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-700">{task.description || 'No description.'}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div><span className="text-gray-500">Priority</span><p className="font-semibold capitalize">{task.priority}</p></div>
              <div><span className="text-gray-500">Due</span><p className="font-semibold">{task.due_date || '-'}</p></div>
              <div><span className="text-gray-500">Assignee</span><p className="font-semibold">{task.assigned_user_name || '-'}</p><p className="text-xs text-gray-500">{task.assigned_user_role || ''} {task.assigned_user_email ? `- ${task.assigned_user_email}` : ''}</p></div>
              <div><span className="text-gray-500">Latest Update</span><p className="font-semibold">{task.latest_progress_summary || '-'}</p></div>
            </div>
            {task.waiting_reason && <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Waiting: {task.waiting_reason}</p>}
            {task.blocked_reason && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">Blocked: {task.blocked_reason}</p>}
            {task.completion_summary && <p className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">Completed: {task.completion_summary}</p>}
          </section>

          {canAssign && <AssignmentPanel task={task} staff={staff} onReassign={onReassign} />}

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900">Progress</h3>
            {!canAssign && !['pending_acceptance'].includes(task.status) && <div className="mt-3"><ProgressForm task={task} onProgressUpdate={onProgressUpdate} /></div>}
            <div className="mt-4 space-y-3">
              {(task.progress_updates || []).map(update => (
                <article key={update.id} className="rounded-md border border-gray-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-gray-900">{update.created_by_name || 'Unknown user'}</p>
                    <p className="text-xs text-gray-500">{new Date(update.created_at).toLocaleString()}</p>
                  </div>
                  <p className="mt-1 text-gray-700">{update.note}</p>
                  {update.previous_stage && <p className="mt-1 text-xs font-medium text-blue-700">{formatStatus(update.previous_stage)} → {formatStatus(update.new_stage)}</p>}
                  {update.reason && <p className="mt-1 text-xs text-gray-600">Reason: {update.reason}</p>}
                  <p className="mt-1 text-xs capitalize text-gray-500">{formatStatus(update.status_at_time)} {update.percentage !== null && update.percentage !== undefined ? `- ${update.percentage}%` : ''}</p>
                </article>
              ))}
              {!(task.progress_updates || []).length && <p className="text-sm text-gray-500">No progress updates yet.</p>}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
            {!canAssign && task.status !== 'pending_acceptance' && <div className="mt-3"><AttachmentForm task={task} onAttachmentUpload={onAttachmentUpload} /></div>}
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {(task.attachments || []).filter(attachment => !attachment.archived_at).map(attachment => (
                <a key={attachment.id} href={attachment.file_url} target="_blank" rel="noreferrer" className="rounded-md border border-gray-200 p-3 text-sm hover:border-blue-300">
                  <p className="font-semibold text-blue-700">{attachment.original_filename || attachment.title || 'Attachment'}</p>
                  <p className="text-xs text-gray-500">{attachment.mime_type} - {formatBytes(attachment.file_size)}</p>
                  <p className="mt-1 text-gray-700">{attachment.caption}</p>
                  <p className="mt-1 text-xs text-gray-500">Uploaded by {attachment.uploaded_by_name || 'Unknown'} on {new Date(attachment.created_at).toLocaleString()}</p>
                </a>
              ))}
              {!(task.attachments || []).filter(attachment => !attachment.archived_at).length && <p className="text-sm text-gray-500">No attachments yet.</p>}
            </div>
          </section>

          <ChecklistPanel task={task} templates={templates} onToggle={onChecklistToggle} onApplyTemplate={onApplyTemplate} />
          <DependencyPanel task={task} tasks={tasks} onCreate={onDependencyCreate} onDelete={onDependencyDelete} />
          <TaskComments task={task} onAdd={onComment} />
          <TaskActivityTimeline task={task} />
        </div>
      </aside>
    </div>
  )
}

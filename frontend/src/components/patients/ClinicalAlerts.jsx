import Alert from '../ui/Alert'

export default function ClinicalAlerts() {
  return (
    <div className='space-y-3'>
      <Alert variant='warning' title='Medical Alert' message='Verify allergies before prescribing medication.' />
      <Alert variant='info' title='Recall Reminder' message='Patient due for hygiene recall.' />
    </div>
  )
}

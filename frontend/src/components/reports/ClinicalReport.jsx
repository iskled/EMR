import SimpleBarList from './SimpleBarList'

export default function ClinicalReport({ data }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <SimpleBarList title="Clinical Notes Volume" rows={data?.clinical_notes_volume || []} labelKey={row => String(row.period).slice(0, 10)} />
      <SimpleBarList title="Treatment Plans by Status" rows={data?.treatment_plans_by_status || []} labelKey="status" />
      <SimpleBarList title="Recalls" rows={data?.recalls || []} labelKey={row => `${row.recall_type} / ${row.status}`} />
      <SimpleBarList title="Dentist Clinical Activity" rows={data?.dentist_activity || []} labelKey={row => `${row.dentist__first_name || ''} ${row.dentist__last_name || row.dentist__email || ''}`.trim()} />
      <SimpleBarList title="Procedure Volumes" rows={data?.procedure_volumes || []} labelKey="treatment_performed" />
      <SimpleBarList title="Common Diagnoses" rows={data?.common_diagnoses || []} labelKey="diagnosis" />
    </div>
  )
}

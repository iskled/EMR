import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ClinicalTimeline from './ClinicalTimeline'
import { getClinicalTimeline } from '../../services/clinical.service'

vi.mock('../../services/clinical.service', () => ({
  getClinicalTimeline: vi.fn(),
}))

describe('ClinicalTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the full clinical note details in the timeline', async () => {
    getClinicalTimeline.mockResolvedValue([
      {
        id: 'note-1',
        event_type: 'note',
        date: '2026-08-10',
        title: 'Treatment',
        subtitle: 'Feeling pain in the gum',
        tooth_number: [],
        meta: {
          dentist: 'Joy Sarimakin',
          note_type: 'treatment',
          treatment_scope: 'whole_mouth',
          chief_complaint: 'Feeling pain in the gum',
          clinical_findings: 'Oral hygiene is fair and disclosed teeth',
          diagnosis: 'Acute gingivitis',
          treatment_performed: 'Scaling and polishing',
          materials_used: 'Polishing paste',
          next_visit_instructions: 'Review in one month',
          notes: 'X ray',
          is_signed: false,
        },
      },
    ])

    render(<ClinicalTimeline patient={{ id: 'patient-1' }} />)

    expect(await screen.findByText('Treatment')).toBeInTheDocument()
    expect(screen.getByText('Joy Sarimakin')).toBeInTheDocument()
    expect(screen.getByText('Chief Complaint')).toBeInTheDocument()
    expect(screen.getAllByText('Feeling pain in the gum')).toHaveLength(2)
    expect(screen.getByText('Assessment')).toBeInTheDocument()
    expect(screen.getByText('Oral hygiene is fair and disclosed teeth')).toBeInTheDocument()
    expect(screen.getByText('Acute gingivitis')).toBeInTheDocument()
    expect(screen.getByText('Scaling and polishing')).toBeInTheDocument()
    expect(screen.getByText('Polishing paste')).toBeInTheDocument()
    expect(screen.getByText('Review in one month')).toBeInTheDocument()
    expect(screen.getByText('X ray')).toBeInTheDocument()
    expect(screen.getByText('Unsigned')).toBeInTheDocument()
  })
})

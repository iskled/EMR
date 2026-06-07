// Enterprise Patient Intake Modal (updated layout example)
import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function PatientIntakeModal() {
  return (
    <Modal>
      <form className="flex flex-col h-[85vh]">
        <div className="flex-1 overflow-y-auto pr-2 space-y-8">
          {/* Move all sections here:
              Identity
              Contact
              CRM
              Clinical
              Emergency
              Uploads
              Notes
              Checkboxes
          */}
        </div>

        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3">
          <Button type="button">
            Cancel
          </Button>

          <Button type="submit">
            Register Patient
          </Button>
        </div>
      </form>
    </Modal>
  )
}

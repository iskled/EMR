import { useState, useEffect } from 'react'
import {
  updateTooth
} from '../../../services/toothChartService'

export default function ToothContextPanel({
  selectedTooth,
  toothData,
  chartId,
  onSaved,
  selectedSurface
}) {

  const [surfaceCondition, setSurfaceCondition] =
    useState('healthy')

  const [form, setForm] = useState({
    condition: '',
    mobility_grade: 0,
    pocket_depth: 0,
    furcation: '',
    notes: ''
  })

  useEffect(() => {

    if (!toothData) return

    setForm({
      condition:
        toothData.condition || '',

      mobility_grade:
        toothData.mobility_grade || 0,

      pocket_depth:
        toothData.pocket_depth || 0,

      furcation:
        toothData.furcation || '',

      notes:
        toothData.notes || ''
    })

  }, [toothData])

  useEffect(() => {

    if (!toothData) return

    // FIX #1

    const surface =
      selectedSurface?.surface || 'O'

    const condition =
      toothData.surface_conditions?.[
        surface
      ]

    setSurfaceCondition(
      condition || 'healthy'
    )

  }, [
    selectedSurface,
    toothData
  ])

  const handleSave = async () => {

    try {

      // FIX #2

      const surface =
        selectedSurface?.surface || 'O'

      const payload = {

        ...form,

        surface_conditions: {

          ...(toothData?.surface_conditions || {}),

          [surface]:
            surfaceCondition

        }

      }

      await updateTooth(
        chartId,
        toothData.tooth_number,
        payload
      )

      if (onSaved) {
        await onSaved()
      }

      alert('Tooth saved successfully')

    } catch (error) {

      console.error(error)

      alert('Failed to save tooth')
    }
  }

  if (!selectedTooth) {

    return (
      <div className="bg-white rounded-lg border p-4">
        Select a tooth
      </div>
    )
  }

  return (

    <div className="bg-white rounded-lg border p-4">

      <h3 className="font-semibold">
        Tooth Details
      </h3>

      <div className="mt-2 mb-4 font-medium">
        {selectedTooth}
      </div>

      <div className="space-y-3">

        <div>
          <label className="block text-sm mb-1">
            Condition
          </label>

          <select
            className="w-full border rounded p-2"
            value={form.condition}
            onChange={(e) =>
              setForm({
                ...form,
                condition: e.target.value
              })
            }
          >
            <option value="healthy">Healthy</option>
            <option value="caries">Caries</option>
            <option value="filled">Filled</option>
            <option value="crown">Crown</option>
            <option value="implant">Implant</option>
            <option value="missing">Missing</option>
            <option value="rct">Root Canal Treated</option>
            <option value="fractured">Fractured</option>
            <option value="bridge_anchor">Bridge Anchor</option>
            <option value="bridge_pontic">Bridge Pontic</option>
            <option value="impacted">Impacted</option>
            <option value="extracted">Extracted</option>
            <option value="watch">Watch</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">
            Mobility
          </label>

          <input
            type="number"
            className="w-full border rounded p-2"
            value={form.mobility_grade}
            onChange={(e) =>
              setForm({
                ...form,
                mobility_grade:
                  Number(e.target.value)
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm mb-1">
            Pocket Depth
          </label>

          <input
            type="number"
            className="w-full border rounded p-2"
            value={form.pocket_depth}
            onChange={(e) =>
              setForm({
                ...form,
                pocket_depth:
                  Number(e.target.value)
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm mb-1">
            Furcation
          </label>

          <select
            className="w-full border rounded p-2"
            value={form.furcation}
            onChange={(e) =>
              setForm({
                ...form,
                furcation: e.target.value
              })
            }
          >
            <option value="">
              None
            </option>

            <option value="I">
              Class I
            </option>

            <option value="II">
              Class II
            </option>

            <option value="III">
              Class III
            </option>

          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">
            Notes
          </label>

          <textarea
            rows={4}
            className="w-full border rounded p-2"
            value={form.notes}
            onChange={(e) =>
              setForm({
                ...form,
                notes: e.target.value
              })
            }
          />
        </div>

        <hr />

        <h4 className="font-medium">
          Surface Charting
        </h4>

        <div
          className="
            bg-blue-50
            border
            rounded
            p-2
            text-sm
          "
        >
          Selected Surface:

          <strong className="ml-2">

            {/* FIX #3 */}

            {selectedSurface?.surface || 'O'}

          </strong>

        </div>

        <div>
          <label className="block text-sm mb-1">
            Surface Condition
          </label>

          <select
            className="w-full border rounded p-2"
            value={surfaceCondition}
            onChange={(e) =>
              setSurfaceCondition(
                e.target.value
              )
            }
          >
            <option value="healthy">
              Healthy
            </option>

            <option value="caries">
              Caries
            </option>

            <option value="filled">
              Filled
            </option>

            <option value="crown">
              Crown
            </option>

            <option value="fracture">
              Fracture
            </option>

          </select>
        </div>

        <button
          onClick={handleSave}
          className="
            w-full
            bg-blue-600
            text-white
            py-2
            rounded
          "
        >
          Save Tooth
        </button>

      </div>

    </div>
  )
}
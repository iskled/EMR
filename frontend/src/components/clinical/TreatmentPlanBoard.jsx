import {
  useEffect,
  useState
} from 'react'

import {
  getTreatmentPlans,
  createTreatmentPlan,
  getTreatmentPlan,
  createPlanItem
} from '../../services/treatmentPlanService'

export default function TreatmentPlanBoard({
  patient
}) {

  const [plans, setPlans] =
    useState([])

  const [selectedPlanId,
    setSelectedPlanId] =
    useState(null)

  const [selectedPlan,
    setSelectedPlan] =
    useState(null)

  const [loading,
    setLoading] =
    useState(false)

  const [newPlanTitle,
    setNewPlanTitle] =
    useState('Comprehensive Treatment Plan')

  const [newItem,
    setNewItem] =
    useState({
      tooth_number: '',
      surfaces: '',
      procedure_name: '',
      procedure_code: '',
      quantity: 1,
      unit_cost: ''
    })

  const loadPlans =
    async () => {

      if (!patient?.id)
        return

      try {

        const data =
          await getTreatmentPlans(
            patient.id
          )

        const plansList =
          data.results || data

        setPlans(plansList)

        if (
          plansList.length > 0 &&
          !selectedPlanId
        ) {
          setSelectedPlanId(
            plansList[0].id
          )
        }

      } catch (error) {

        console.error(
          'Failed loading plans',
          error
        )
      }
    }

  const loadPlan =
    async (planId) => {

      try {

        const data =
          await getTreatmentPlan(
            planId
          )

        setSelectedPlan(
          data
        )

      } catch (error) {

        console.error(
          'Failed loading plan',
          error
        )
      }
    }

  useEffect(() => {
    loadPlans()
  }, [patient])

  useEffect(() => {

    if (
      selectedPlanId
    ) {
      loadPlan(
        selectedPlanId
      )
    }

  }, [selectedPlanId])

  const handleCreatePlan =
    async () => {

      try {

        setLoading(true)

        const created =
          await createTreatmentPlan({

            patient:
              patient.id,

            title:
              newPlanTitle,

            description:
              '',

            status:
              'draft'
          })

        await loadPlans()

        setSelectedPlanId(
          created.id
        )

      } catch (error) {

        console.error(
          error
        )

        alert(
          'Failed creating plan'
        )

      } finally {

        setLoading(false)
      }
    }

  const handleAddItem =
    async () => {

      if (
        !selectedPlanId
      ) {

        alert(
          'Select a treatment plan first'
        )

        return
      }

      try {

        await createPlanItem(
          selectedPlanId,
          {
            ...newItem,
            quantity:
              Number(
                newItem.quantity
              ) || 1,

            unit_cost:
              Number(
                newItem.unit_cost
              ) || 0
          }
        )

        setNewItem({
          tooth_number: '',
          surfaces: '',
          procedure_name: '',
          procedure_code: '',
          quantity: 1,
          unit_cost: ''
        })

        await loadPlan(
          selectedPlanId
        )

      } catch (error) {

        console.error(
          error
        )

        alert(
          'Failed creating treatment item'
        )
      }
    }

  return (

    <div
      className="
        bg-white
        rounded-2xl
        shadow
        p-6
      "
    >

      <h2
        className="
          text-xl
          font-bold
          mb-4
        "
      >
        Treatment Plans
      </h2>

      {/* CREATE PLAN */}

      <div
        className="
          border
          rounded
          p-4
          mb-4
        "
      >

        <div
          className="
            font-semibold
            mb-2
          "
        >
          New Treatment Plan
        </div>

        <div
          className="
            flex
            gap-2
          "
        >

          <input
            className="
              flex-1
              border
              rounded
              p-2
            "
            value={
              newPlanTitle
            }
            onChange={(e) =>
              setNewPlanTitle(
                e.target.value
              )
            }
          />

          <button
            onClick={
              handleCreatePlan
            }
            disabled={
              loading
            }
            className="
              px-4
              py-2
              rounded
              bg-blue-600
              text-white
            "
          >
            Create
          </button>

        </div>

      </div>

      {/* PLAN LIST */}

      <div
        className="
          mb-4
        "
      >

        <label
          className="
            block
            mb-2
            font-medium
          "
        >
          Select Plan
        </label>

        <select
          className="
            w-full
            border
            rounded
            p-2
          "
          value={
            selectedPlanId || ''
          }
          onChange={(e) =>
            setSelectedPlanId(
              e.target.value
            )
          }
        >

          <option value="">
            Select
          </option>

          {plans.map(
            plan => (

              <option
                key={
                  plan.id
                }
                value={
                  plan.id
                }
              >
                {plan.title}
              </option>

            )
          )}

        </select>

      </div>

      {/* ITEMS */}

      {selectedPlan && (

        <>

          <div
            className="
              border
              rounded
              p-4
              mb-4
            "
          >

            <div
              className="
                font-semibold
                mb-2
              "
            >
              Add Treatment Item
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-2
              "
            >

              <input
                placeholder="Tooth"
                className="
                  border
                  rounded
                  p-2
                "
                value={
                  newItem.tooth_number
                }
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    tooth_number:
                      e.target.value
                  })
                }
              />

              <input
                placeholder="Surface"
                className="
                  border
                  rounded
                  p-2
                "
                value={
                  newItem.surfaces
                }
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    surfaces:
                      e.target.value
                  })
                }
              />

              <input
                placeholder="Procedure"
                className="
                  border
                  rounded
                  p-2
                "
                value={
                  newItem.procedure_name
                }
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    procedure_name:
                      e.target.value
                  })
                }
              />

              <input
                placeholder="Code"
                className="
                  border
                  rounded
                  p-2
                "
                value={
                  newItem.procedure_code
                }
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    procedure_code:
                      e.target.value
                  })
                }
              />

              <input
                type="number"
                placeholder="Qty"
                className="
                  border
                  rounded
                  p-2
                "
                value={
                  newItem.quantity
                }
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    quantity:
                      e.target.value
                  })
                }
              />

              <input
                type="number"
                placeholder="Cost"
                className="
                  border
                  rounded
                  p-2
                "
                value={
                  newItem.unit_cost
                }
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    unit_cost:
                      e.target.value
                  })
                }
              />

            </div>

            <button
              onClick={
                handleAddItem
              }
              className="
                mt-3
                px-4
                py-2
                bg-green-600
                text-white
                rounded
              "
            >
              Add Item
            </button>

          </div>

          <table
            className="
              w-full
              border
            "
          >

            <thead>

              <tr
                className="
                  bg-gray-100
                "
              >

                <th>Tooth</th>
                <th>Surface</th>
                <th>Procedure</th>
                <th>Status</th>
                <th>Cost</th>

              </tr>

            </thead>

            <tbody>

              {selectedPlan.items?.map(
                item => (

                  <tr
                    key={
                      item.id
                    }
                  >

                    <td>
                      {item.tooth_number}
                    </td>

                    <td>
                      {item.surfaces}
                    </td>

                    <td>
                      {item.procedure_name}
                    </td>

                    <td>
                      {item.status}
                    </td>

                    <td>
                      {item.total_cost}
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </>

      )}

    </div>
  )
}
import React from 'react'

export default function ToothContextPanel({
  selectedTooth,
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold">
        Tooth Details
      </h3>

      {selectedTooth ? (
        <>
          <div className="mt-4 text-lg font-bold">
            {selectedTooth}
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Clinical history for this tooth
            will appear here.
          </div>
        </>
      ) : (
        <div className="mt-4 text-gray-500">
          Select a tooth.
        </div>
      )}
    </div>
  )
}
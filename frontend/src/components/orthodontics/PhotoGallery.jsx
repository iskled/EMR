export default function PhotoGallery({ photos = [], onDelete }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {photos.map(photo => (
        <div key={photo.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {photo.image_url ? (
            <img src={photo.image_url} alt={photo.caption || photo.photo_type} className="h-44 w-full object-cover" />
          ) : (
            <div className="flex h-44 items-center justify-center bg-gray-100 text-sm text-gray-500">No preview</div>
          )}
          <div className="space-y-2 p-3">
            <p className="font-semibold">{photo.caption || photo.photo_type}</p>
            <p className="text-sm text-gray-500">{photo.taken_at}</p>
            <button type="button" onClick={() => onDelete?.(photo)} className="text-sm font-semibold text-rose-700 hover:underline">
              Delete
            </button>
          </div>
        </div>
      ))}
      {!photos.length && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No orthodontic photos uploaded.
        </div>
      )}
    </div>
  )
}

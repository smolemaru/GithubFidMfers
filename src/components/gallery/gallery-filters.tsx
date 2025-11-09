'use client'

interface GalleryFiltersProps {
  onFilterChange: (filter: string) => void
}

export function GalleryFilters({ onFilterChange }: GalleryFiltersProps) {
  return (
    <div className="glass p-4 rounded-xl mb-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onFilterChange('all')}
          className="px-4 py-2 rounded-lg glass-hover font-semibold text-sm"
        >
          All
        </button>
        <button
          onClick={() => onFilterChange('top')}
          className="px-4 py-2 rounded-lg glass-hover font-semibold text-sm"
        >
          Top Voted
        </button>
        <button
          onClick={() => onFilterChange('recent')}
          className="px-4 py-2 rounded-lg glass-hover font-semibold text-sm"
        >
          Recent
        </button>
        <button
          onClick={() => onFilterChange('selected')}
          className="px-4 py-2 rounded-lg glass-hover font-semibold text-sm"
        >
          Top 900
        </button>
      </div>
    </div>
  )
}


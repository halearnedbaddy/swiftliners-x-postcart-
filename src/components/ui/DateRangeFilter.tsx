import { useState } from 'react';
import { CalendarIcon, XIcon } from '@/components/icons';

interface DateRangeFilterProps {
  onApply: (startDate: string | null, endDate: string | null) => void;
  onClear: () => void;
  startDate: string | null;
  endDate: string | null;
}

export function DateRangeFilter({ onApply, onClear, startDate, endDate }: DateRangeFilterProps) {
  const [localStart, setLocalStart] = useState(startDate || '');
  const [localEnd, setLocalEnd] = useState(endDate || '');
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    onApply(localStart || null, localEnd || null);
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalStart('');
    setLocalEnd('');
    onClear();
    setIsOpen(false);
  };

  const hasFilter = startDate || endDate;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 border rounded-null-lg text-sm font-medium transition ${
          hasFilter 
            ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100' 
            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <CalendarIcon size={16} />
        {hasFilter ? (
          <span>
            {startDate && endDate 
              ? `${startDate} - ${endDate}` 
              : startDate 
                ? `From ${startDate}` 
                : `Until ${endDate}`}
          </span>
        ) : (
          'Date Range'
        )}
        {hasFilter && (
          <button 
            type="button"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleClear(); }}
            className="ml-1 hover:text-red-600"
          >
            <XIcon size={14} />
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-null-xl shadow-lg p-4 z-50 min-w-[300px]">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Filter by Date Range</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-null-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={localEnd}
                onChange={(e) => setLocalEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-null-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleClear}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-null-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-null-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

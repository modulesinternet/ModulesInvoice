import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-5 bg-slate-50 border-t border-slate-100 rounded-b-2xl no-print text-sans select-none">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1); // reset to page 1 on scale
          }}
          className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1 outline-none font-bold shadow-xs cursor-pointer"
        >
          {[5, 10, 20, 30, 50].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <span className="text-[11px] font-medium text-slate-400">
          Showing <span className="font-bold text-slate-600">{Math.min(totalItems, (currentPage - 1) * pageSize + 1)}</span> to <span className="font-bold text-slate-600">{Math.min(totalItems, currentPage * pageSize)}</span> of <span className="font-bold text-slate-600">{totalItems}</span> items
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1 px-2 border border-slate-200 hover:border-indigo-300 rounded-md bg-white text-[11px] font-bold text-slate-600 transition enabled:cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-1 select-none"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-md min-w-[70px] text-center">
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1 px-2 border border-slate-200 hover:border-indigo-300 rounded-md bg-white text-[11px] font-bold text-slate-600 transition enabled:cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-1 select-none"
          title="Next Page"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';

export interface PaginationConfig {
  initialPage?: number;
  pageSize?: number;
}

export interface PaginationResult<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  currentData: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setPageSize: (size: number) => void;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

export function usePagination<T>(
  data: T[],
  config: PaginationConfig = {}
): PaginationResult<T> {
  const { initialPage = 1, pageSize: initialPageSize = 20 } = config;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = useMemo(() => {
    return Math.ceil(data.length / pageSize);
  }, [data.length, pageSize]);

  const currentData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, data.length);

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const previousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return {
    currentPage,
    totalPages,
    pageSize,
    currentData,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    goToFirstPage,
    goToLastPage,
    setPageSize: handleSetPageSize,
    startIndex,
    endIndex,
    totalItems: data.length,
  };
}

// Pagination Controls Component
export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPreviousPage,
  startIndex,
  endIndex,
  totalItems,
}: PaginationControlsProps) {
  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, current, and surrounding pages
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-[#202225]">
      <div className="text-sm text-gray-400">
        Showing {startIndex} to {endIndex} of {totalItems} results
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2f3136] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Previous
        </button>

        <div className="flex gap-1">
          {renderPageNumbers().map((page, index) =>
            typeof page === 'number' ? (
              <button
                key={index}
                onClick={() => onPageChange(page)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-[#8B5CF6] text-white'
                    : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2f3136] hover:text-white'
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={index} className="w-10 h-10 flex items-center justify-center text-gray-600">
                {page}
              </span>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2f3136] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Next
        </button>
      </div>
    </div>
  );
}


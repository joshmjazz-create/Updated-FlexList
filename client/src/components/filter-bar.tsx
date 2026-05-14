import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilters: Record<string, string | string[]>;
  onFilterChange: (filters: Record<string, string | string[]>) => void;
  onToggleFilters: () => void;
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  activeFilters,
  onFilterChange,
  onToggleFilters,
}: FilterBarProps) {
  const removeFilter = (key: string, valueToRemove?: string) => {
    const newFilters = { ...activeFilters };
    
    if (valueToRemove) {
      // Remove a specific value from the filter
      const currentValue = newFilters[key];
      if (Array.isArray(currentValue)) {
        const filteredValues = currentValue.filter(v => v !== valueToRemove);
        if (filteredValues.length > 0) {
          newFilters[key] = filteredValues.length === 1 ? filteredValues[0] : filteredValues;
        } else {
          delete newFilters[key];
        }
      } else if (currentValue === valueToRemove) {
        delete newFilters[key];
      }
    } else {
      // Remove the entire filter key
      delete newFilters[key];
    }
    
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({});
    onSearchChange("");
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center space-x-4 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <Button
          variant="outline"
          onClick={onToggleFilters}
          className="text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Active Filters */}
      {(Object.keys(activeFilters).length > 0 || searchQuery) && (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(activeFilters).map(([key, value]) => {
            const values = Array.isArray(value) ? value : [value];
            return values.map((val, index) => (
              <Badge
                key={`${key}-${val}-${index}`}
                variant="secondary"
                className="bg-primary-100 text-primary-800 border-primary-200"
              >
                {key}: {val}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newFilters = { ...activeFilters };
                    if (Array.isArray(newFilters[key])) {
                      const filteredValues = (newFilters[key] as string[]).filter(v => v !== val);
                      if (filteredValues.length === 0) {
                        delete newFilters[key];
                      } else {
                        newFilters[key] = filteredValues;
                      }
                    } else {
                      delete newFilters[key];
                    }
                    onFilterChange(newFilters);
                  }}
                  className="ml-2 h-auto p-0 text-primary-600 hover:text-primary-800"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ));
          })}
          
          {(Object.keys(activeFilters).length > 0 || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

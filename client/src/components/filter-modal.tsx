import { useState, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight } from "lucide-react";

interface FilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId?: string;
  items: any[];
  activeFilters: Record<string, string | string[]>;
  onFiltersChange: (filters: Record<string, string | string[]>) => void;
}

export default function FilterModal({
  open,
  onOpenChange,
  collectionId,
  items,
  activeFilters,
  onFiltersChange,
}: FilterModalProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const { data: availableTags = {}, isLoading } = useQuery<Record<string, { value: string; count: number }[]>>({
    queryKey: ["/api/collections", collectionId, "tags"],
    enabled: !!collectionId && open,
  });

  const handleFilterChange = (key: string, value: string, checked: boolean) => {
    const newFilters = { ...activeFilters };
    if (checked) {
      if (newFilters[key]) {
        const currentValues = Array.isArray(newFilters[key]) ? newFilters[key] : [newFilters[key]];
        if (!currentValues.includes(value)) {
          newFilters[key] = [...currentValues, value];
        }
      } else {
        newFilters[key] = [value];
      }
    } else {
      if (newFilters[key]) {
        const currentValues = Array.isArray(newFilters[key]) ? newFilters[key] : [newFilters[key]];
        const filteredValues = currentValues.filter(v => v !== value);
        if (filteredValues.length === 0) {
          delete newFilters[key];
        } else {
          newFilters[key] = filteredValues;
        }
      }
    }
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const applyFilters = () => {
    onOpenChange(false);
  };

  const toggleSection = (tagKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(tagKey)) {
      newExpanded.delete(tagKey);
    } else {
      newExpanded.add(tagKey);
    }
    setExpandedSections(newExpanded);
  };

  const getTagCount = (key: string, value: string) => {
    if (!items || !Array.isArray(items)) return 0;

    if (
      key.toLowerCase() === "knowledge level" ||
      key.toLowerCase() === "color"
    ) {
      return items.filter(item => {
        const level = (item.knowledgeLevel || "").toLowerCase();
        return level === value.toLowerCase();
      }).length;
    }

    const normKey = key.toLowerCase();
    const normValue = value.toLowerCase().trim();

    return items.filter(item => {
      const values = getValuesForFilter(item, normKey);
      return values.some(v => v === normValue);
    }).length;
  };

  const getKnowledgeLevelCount = (value: string) => {
    const knowledgeTags = availableTags["Knowledge Level"] || [];
    const match = knowledgeTags.find(tag => tag.value === value);
    return match?.count ?? 0;
  };

  const descId = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={descId} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Filter Items</DialogTitle>
          <DialogDescription id={descId}>
            Choose one or more tags to narrow down the items in this collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-96 overflow-y-auto">
          {isLoading && <div className="text-center py-8 text-gray-500">Loading filters...</div>}

          {!isLoading && (
            <>
              <div>
                <button
                  type="button"
                  onClick={() => toggleSection('Knowledge Level')}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 mb-3 hover:text-gray-900 transition-colors"
                >
                  <span>Knowledge Level</span>
                  {expandedSections.has('Knowledge Level') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {expandedSections.has('Knowledge Level') && (
                  <div className="space-y-2 ml-4 mb-4">
                    {['knows', 'kind-of-knows', 'does-not-know'].map(value => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`knowledge level-${value}`}
                          checked={
                            activeFilters['Knowledge Level']
                              ? Array.isArray(activeFilters['Knowledge Level'])
                                ? (activeFilters['Knowledge Level'] as string[]).includes(value)
                                : activeFilters['Knowledge Level'] === value
                              : false
                          }
                          onCheckedChange={(checked) => handleFilterChange('Knowledge Level', value, checked as boolean)}
                        />
                        <Label htmlFor={`knowledge level-${value}`} className="text-sm text-gray-700 cursor-pointer flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded border-2 ${
                            value === 'knows' ? 'bg-green-200 border-green-300' :
                            value === 'kind-of-knows' ? 'bg-orange-200 border-orange-300' :
                            'bg-red-200 border-red-300'
                          }`} />
                          <span className="text-gray-400">({getKnowledgeLevelCount(value)})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {Object.entries(availableTags)
                .filter(([tagKey]) => tagKey.toLowerCase() !== 'title' && tagKey.toLowerCase() !== 'knowledge level')
                .map(([tagKey, tags]) => (
                  <div key={tagKey}>
                    <button
                      type="button"
                      onClick={() => toggleSection(tagKey)}
                      className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 mb-3 hover:text-gray-900 transition-colors"
                    >
                      <span>{tagKey}</span>
                      {expandedSections.has(tagKey) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {expandedSections.has(tagKey) && (
                      <div className="space-y-2 ml-4 mb-4">
                        {tags.map(tag => (
                          <div key={tag.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${tagKey}-${tag.value}`}
                              checked={
                                activeFilters[tagKey]
                                  ? Array.isArray(activeFilters[tagKey])
                                    ? (activeFilters[tagKey] as string[]).includes(tag.value)
                                    : activeFilters[tagKey] === tag.value
                                  : false
                              }
                              onCheckedChange={(checked) => handleFilterChange(tagKey, tag.value, checked as boolean)}
                            />
                            <Label htmlFor={`${tagKey}-${tag.value}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                              {tag.value} <span className="text-gray-400">({tag.count})</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

              {Object.keys(availableTags).filter(key => key.toLowerCase() !== 'title').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No tags available in this collection
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="ghost" onClick={clearAllFilters} className="text-gray-600 hover:text-gray-800">Clear All</Button>
          <Button onClick={applyFilters}>Apply Filters</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from './ui/input';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutocompleteInputProps {
  field: 'key' | 'composer' | 'style';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function AutocompleteInput({
  field,
  value,
  onChange,
  placeholder,
  className,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Predefined list of musical keys
  const musicalKeys = [
    'A', 'A minor', 'B', 'B minor', 'Bb', 'Bb minor', 'C', 'C minor',
    'D', 'D minor', 'Db', 'Db minor', 'E', 'E minor', 'Eb', 'Eb minor',
    'F', 'F minor', 'G', 'G minor', 'Gb', 'Gb minor'
  ];

  // Fetch field values for autocomplete
  const { data: fieldValues = [] } = useQuery<string[]>({
    queryKey: [`/api/field-values/${field}`],
  });

// Clean field values so autocomplete only works with strings
const cleanFieldValues = fieldValues
  .map((val: any) => {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object') {
      return val.value ?? val.name ?? val.label ?? '';
    }
    return '';
  })
  .filter((val: string) => val.trim() !== '');

// Combine all available values - for key field, always include musical keys
const allValues = field === 'key'
  ? Array.from(new Set([...musicalKeys, ...cleanFieldValues]))
  : Array.from(new Set(cleanFieldValues));

  // Filter values based on current input - for keys, always show all when empty
  const filteredValues = field === 'key'
    ? value.trim()
      ? allValues.filter(val =>
          val.toLowerCase().includes(value.toLowerCase())
        )
      : allValues // Show all keys when input is empty
    : value.trim()
      ? allValues.filter(val =>
          val.toLowerCase().includes(value.toLowerCase())
        )
      : []; // Show nothing when input is empty for other fields

  // Show dropdown when focused and has values to show
  const showDropdown = inputFocused && isOpen && filteredValues.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setInputFocused(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    // For key field, always keep open. For other fields, open when typing, close when empty
    if (field === 'key') {
      setIsOpen(true);
    } else if (newValue.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleFocus = () => {
    setInputFocused(true);
    // For key field, always open. For other fields, only open if there's text
    if (field === 'key' || value.trim()) {
      setIsOpen(true);
    }
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setInputFocused(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
      />
      
      {showDropdown && (
        <>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 rounded-md shadow-lg max-h-64 overflow-y-auto">
            {filteredValues.map((fieldValue) => (
              <div
                key={fieldValue}
                className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSelect(fieldValue);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === fieldValue ? "opacity-100" : "opacity-0"
                  )}
                />
                {fieldValue}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
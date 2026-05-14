import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ChevronDown } from "lucide-react";

interface AutocompleteTagInputProps {
  tags: Record<string, string>;
  onChange: (tags: Record<string, string>) => void;
  className?: string;
}

interface AutocompleteDropdownProps {
  isOpen: boolean;
  items: string[];
  onSelect: (item: string) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

function AutocompleteDropdown({ isOpen, items, onSelect, onClose, inputRef }: AutocompleteDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, inputRef]);

  if (!isOpen || items.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
    >
      {items.map((item, index) => (
        <button
          key={index}
          className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none first:rounded-t-lg last:rounded-b-lg"
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function AutocompleteTagInput({ tags, onChange, className }: AutocompleteTagInputProps) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [keyAutocomplete, setKeyAutocomplete] = useState<string[]>([]);
  const [valueAutocomplete, setValueAutocomplete] = useState<string[]>([]);
  const [showKeyDropdown, setShowKeyDropdown] = useState(false);
  const [showValueDropdown, setShowValueDropdown] = useState(false);
  const [allKeys, setAllKeys] = useState<string[]>([]);

  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);

  // Load all available keys on mount
  useEffect(() => {
    async function loadKeys() {
      try {
        const response = await fetch("/api/tags/keys");
        if (response.ok) {
          const keys = await response.json();
          setAllKeys(keys);
        }
      } catch (error) {
        console.error("Failed to load tag keys:", error);
      }
    }
    loadKeys();
  }, []);

  // Update key autocomplete based on input
  useEffect(() => {
    if (newKey.trim()) {
      const filtered = allKeys.filter(key => 
        key.toLowerCase().includes(newKey.toLowerCase())
      );
      setKeyAutocomplete(filtered);
      setShowKeyDropdown(filtered.length > 0);
    } else {
      setKeyAutocomplete(allKeys);
      setShowKeyDropdown(false);
    }
  }, [newKey, allKeys]);

  // Load values when key changes
  useEffect(() => {
    async function loadValues() {
      if (newKey.trim()) {
        try {
          const response = await fetch(`/api/tags/values/${encodeURIComponent(newKey)}`);
          if (response.ok) {
            const values = await response.json();
            setValueAutocomplete(values);
          } else {
            setValueAutocomplete([]);
          }
        } catch (error) {
          console.error("Failed to load tag values:", error);
          setValueAutocomplete([]);
        }
      } else {
        setValueAutocomplete([]);
      }
    }
    loadValues();
  }, [newKey]);

  // Update value autocomplete based on input
  useEffect(() => {
    if (newValue.trim() && valueAutocomplete.length > 0) {
      const filtered = valueAutocomplete.filter(value => 
        value.toLowerCase().includes(newValue.toLowerCase())
      );
      setShowValueDropdown(filtered.length > 0);
    } else {
      setShowValueDropdown(false);
    }
  }, [newValue, valueAutocomplete]);

  const addTag = () => {
    if (newKey.trim() && newValue.trim()) {
      const updated = { ...tags, [newKey.trim()]: newValue.trim() };
      onChange(updated);
      setNewKey("");
      setNewValue("");
      setShowKeyDropdown(false);
      setShowValueDropdown(false);
    }
  };

  const removeTag = (key: string) => {
    const updated = { ...tags };
    delete updated[key];
    onChange(updated);
  };

  const handleKeySelect = (key: string) => {
    setNewKey(key);
    setShowKeyDropdown(false);
    // Focus value input after selecting key
    setTimeout(() => valueInputRef.current?.focus(), 0);
  };

  const handleValueSelect = (value: string) => {
    setNewValue(value);
    setShowValueDropdown(false);
    // Auto-add tag when both key and value are selected
    if (newKey.trim()) {
      const updated = { ...tags, [newKey.trim()]: value.trim() };
      onChange(updated);
      setNewKey("");
      setNewValue("");
    }
  };

  const handleKeyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && keyAutocomplete.length > 0) {
      e.preventDefault();
      handleKeySelect(keyAutocomplete[0]);
    } else if (e.key === 'Tab' && newKey.trim()) {
      e.preventDefault();
      valueInputRef.current?.focus();
    }
  };

  const handleValueKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (valueAutocomplete.length > 0 && newValue.trim()) {
        // If there's a matching autocomplete option, use it
        const exactMatch = valueAutocomplete.find(v => 
          v.toLowerCase() === newValue.toLowerCase()
        );
        if (exactMatch) {
          handleValueSelect(exactMatch);
        } else {
          // Use the first autocomplete option
          handleValueSelect(valueAutocomplete[0]);
        }
      } else if (newKey.trim() && newValue.trim()) {
        // Add tag directly if no autocomplete matches
        addTag();
      }
    }
  };

  const filteredKeyAutocomplete = newKey.trim() 
    ? keyAutocomplete.filter(key => 
        key.toLowerCase().includes(newKey.toLowerCase())
      )
    : [];

  const filteredValueAutocomplete = newValue.trim() 
    ? valueAutocomplete.filter(value => 
        value.toLowerCase().includes(newValue.toLowerCase())
      )
    : valueAutocomplete;

  return (
    <div className={className}>
      <Label className="text-sm font-medium text-gray-700">Tags</Label>
      
      {/* Display existing tags */}
      {Object.entries(tags).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(tags).map(([key, value]) => (
            <Badge key={key} variant="secondary" className="flex items-center gap-1">
              <span className="font-medium">{key}:</span>
              <span>{value}</span>
              <button
                type="button"
                onClick={() => removeTag(key)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add new tag form */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="relative">
          <Input
            ref={keyInputRef}
            type="text"
            placeholder="Tag name"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={handleKeyKeyDown}
            onFocus={() => setShowKeyDropdown(keyAutocomplete.length > 0)}
            className="pr-8"
          />
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <AutocompleteDropdown
            isOpen={showKeyDropdown}
            items={filteredKeyAutocomplete}
            onSelect={handleKeySelect}
            onClose={() => setShowKeyDropdown(false)}
            inputRef={keyInputRef}
          />
        </div>
        
        <div className="relative">
          <Input
            ref={valueInputRef}
            type="text"
            placeholder="Tag value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleValueKeyDown}
            onFocus={() => setShowValueDropdown(filteredValueAutocomplete.length > 0)}
            className="pr-8"
          />
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <AutocompleteDropdown
            isOpen={showValueDropdown}
            items={filteredValueAutocomplete}
            onSelect={handleValueSelect}
            onClose={() => setShowValueDropdown(false)}
            inputRef={valueInputRef}
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={addTag}
        disabled={!newKey.trim() || !newValue.trim()}
        className="mt-2 w-full sm:w-auto"
        variant="outline"
        size="sm"
      >
        <Plus className="w-4 h-4 mr-1" />
        Add Tag
      </Button>
    </div>
  );
}
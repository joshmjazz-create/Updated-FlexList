import { saveLeadSheetFile, resolveLeadSheet } from "@/utils/leadSheets";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Image } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import AutocompleteInput from "./autocomplete-input";

interface ExtraTag {
  key: string;
  value: string;
}

interface FormData {
  title: string;
  key: string;
  composer: string;
  style: string;
  notes: string;
  leadSheetUrl: string;
  mediaUrl: string;
  knowledgeLevel: string;
  extraTags: ExtraTag[];
}

interface ItemFormProps {
  initial?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  onChange?: (data: FormData) => void;
  isSubmitting?: boolean;
}

function TagAutocomplete({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = value.trim()
    ? options.filter(option =>
        option.toLowerCase().includes(value.toLowerCase())
      )
    : options;

  const showDropdown = isOpen && filteredOptions.length > 0;

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 100);
        }}
        placeholder={placeholder}
      />

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {filteredOptions.map((option) => (
            <div
              key={option}
              className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TagValueAutocomplete({
  tagKey,
  value,
  onChange,
  placeholder,
}: {
  tagKey: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const encodedTagKey = encodeURIComponent(tagKey.trim());

  const { data: tagValues = [] } = useQuery<string[]>({
    queryKey: ["/api/tags/values", tagKey],
    enabled: !!tagKey.trim(),
    queryFn: async () => {
      const res = await fetch(`/api/tags/values/${encodedTagKey}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <TagAutocomplete
      value={value}
      options={tagValues}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

function LeadSheetPreview({ imageUrl }: { imageUrl: string }) {
  const [resolved, setResolved] = useState<string>();

  useEffect(() => {
  let cancelled = false;

  resolveLeadSheet(imageUrl).then((url) => {
    if (!cancelled) setResolved(url);
  });

  return () => {
    cancelled = true;
  };
}, [imageUrl]);

  if (!resolved) return null;

  return (
    <img
      src={resolved}
      alt="Lead sheet preview"
      className="mt-2 max-h-48 rounded border"
    />
  );
}

export default function ItemForm({ initial, onSubmit, onCancel, onChange, isSubmitting = false }: ItemFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: initial?.title || "",
    key: initial?.key || "",
    composer: initial?.composer || "",
    style: initial?.style || "",
    notes: initial?.notes || "",
    leadSheetUrl: initial?.leadSheetUrl || "",
    mediaUrl: initial?.mediaUrl || "",
    knowledgeLevel: initial?.knowledgeLevel || "does-not-know",
    extraTags: initial?.extraTags || [],
  });

  const { data: tagKeys = [] } = useQuery<string[]>({
    queryKey: ["/api/tags/keys"],
    queryFn: async () => {
      const res = await fetch("/api/tags/keys");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const updateField = (field: keyof Omit<FormData, "extraTags">, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    onChange?.(newFormData);
  };

  const addExtraTag = () => {
    const newFormData = { ...formData, extraTags: [...formData.extraTags, { key: "", value: "" }] };
    setFormData(newFormData);
    onChange?.(newFormData);
  };

  const updateExtraTag = (index: number, field: "key" | "value", value: string) => {
    const newFormData = {
      ...formData,
      extraTags: formData.extraTags.map((tag, i) => (i === index ? { ...tag, [field]: value } : tag)),
    };
    setFormData(newFormData);
    onChange?.(newFormData);
  };

  const removeExtraTag = (index: number) => {
    const newFormData = { ...formData, extraTags: formData.extraTags.filter((_, i) => i !== index) };
    setFormData(newFormData);
    onChange?.(newFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSubmit(formData);
  };

  const handleLeadSheetFile = async (file: File) => {
  try {
    const savedFileName = await saveLeadSheetFile(file);

    const newFormData = {
      ...formData,
      leadSheetUrl: savedFileName,
    };

    setFormData(newFormData);
    onChange?.(newFormData);
  } catch (err) {
    console.error("Failed to save lead sheet:", err);
  }
};

  const handleLeadSheetInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleLeadSheetFile(f);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Song Details</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Enter song title"
              required
            />
          </div>
          <div>
            <Label htmlFor="key">Key</Label>
            <AutocompleteInput field="key" value={formData.key} onChange={(value) => updateField("key", value)} />
          </div>
          <div>
            <Label htmlFor="composer">Composer</Label>
            <AutocompleteInput
              field="composer"
              value={formData.composer}
              onChange={(value) => updateField("composer", value)}
            />
          </div>
          <div>
            <Label htmlFor="style">Style</Label>
            <AutocompleteInput field="style" value={formData.style} onChange={(value) => updateField("style", value)} />
          </div>
          <div>
            <Label>Lead Sheet (Upload Image)</Label>
            <div className="space-y-2">
              {formData.leadSheetUrl && (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border">
                  <Image className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300">Lead sheet selected</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateField("leadSheetUrl", "")}
                    className="ml-auto text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <Input type="file" accept="image/*" onChange={handleLeadSheetInput} />
              <p className="text-xs text-gray-500">Upload a .png or .jpg image of the lead sheet</p>
              {formData.leadSheetUrl && (
                <LeadSheetPreview imageUrl={formData.leadSheetUrl} />
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="knowledgeLevel">Knowledge Level</Label>
            <Select value={formData.knowledgeLevel} onValueChange={(value) => updateField("knowledgeLevel", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select knowledge level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="does-not-know">Learning</SelectItem>
                <SelectItem value="kind-of-knows">Kind of Knows</SelectItem>
                <SelectItem value="knows">Knows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="mediaUrl">Media URL (YouTube, Spotify, or Apple Music)</Label>
          <Input
            id="mediaUrl"
            value={formData.mediaUrl}
            onChange={(e) => updateField("mediaUrl", e.target.value)}
            placeholder="Paste YouTube, Spotify, or Apple Music URL"
          />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Add any notes or comments"
            rows={3}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Additional Tags</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addExtraTag}
            className="text-gray-900 dark:text-gray-100"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Tag
          </Button>
        </div>
        {formData.extraTags.length > 0 && (
          <div className="space-y-3">
            {formData.extraTags.map((tag, index) => (
              <div key={index} className="flex gap-2 items-center">
                <div className="flex-1">
                  <TagAutocomplete
                    value={tag.key}
                    options={tagKeys}
                    onChange={(value) => updateExtraTag(index, "key", value)}
                    placeholder="Tag name (e.g., Era, Tempo)"
                  />
                </div>
                <div className="flex-1">
                  <TagValueAutocomplete
                    tagKey={tag.key}
                    value={tag.value}
                    onChange={(value) => updateExtraTag(index, "value", value)}
                    placeholder="Tag value (e.g., 1950s, Slow)"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeExtraTag(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {formData.extraTags.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No additional tags. Use the "Add Tag" button to add custom attributes.
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting || !formData.title.trim()} className="text-gray-900 dark:text-gray-100">
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="text-gray-900 dark:text-gray-100">
          Cancel
        </Button>
      </div>
    </form>
  );
}
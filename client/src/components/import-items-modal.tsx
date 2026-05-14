import { useState, useId } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Copy, Search } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import type { Collection, Item } from '@shared/schema';

interface ImportItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCollectionId: string;
}

export default function ImportItemsModal({ isOpen, onClose, targetCollectionId }: ImportItemsModalProps) {
  const [sourceCollectionId, setSourceCollectionId] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['/api/collections'],
    enabled: isOpen,
  });

  const { data: sourceItems = [] } = useQuery<Item[]>({
    queryKey: [`/api/collections/${sourceCollectionId}/items`],
    enabled: !!sourceCollectionId && isOpen,
  });

  const availableCollections = collections.filter(col => col.id !== targetCollectionId);

  const filteredItems = sourceItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.composer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.style?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const importItemsMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const response = await fetch(`/api/collections/${targetCollectionId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
      });
      if (!response.ok) throw new Error('Failed to import items');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Imported ${data.count} items successfully`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/collections/${targetCollectionId}/items`] });
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      resetAndClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import items",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleImport = (importAll = false) => {
    const itemIds = importAll ? filteredItems.map(item => item.id) : Array.from(selectedItems);
    if (itemIds.length === 0) return;
    importItemsMutation.mutate(itemIds);
  };

  const resetAndClose = () => {
    setSelectedItems(new Set());
    setSourceCollectionId('');
    setSearchQuery('');
    onClose();
  };

  const descId = useId();
  const selectLabelId = useId();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAndClose(); }}>
      <DialogContent aria-describedby={descId} className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Import Items from Another List
          </DialogTitle>
          <DialogDescription id={descId}>
            Choose a source list, optionally search, select items, and import them into your current list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <Label id={selectLabelId} className="text-sm font-medium">Select Source List</Label>
            <Select value={sourceCollectionId} onValueChange={setSourceCollectionId}>
              <SelectTrigger aria-labelledby={selectLabelId}>
                <SelectValue placeholder="Choose a list to import from" />
              </SelectTrigger>
              <SelectContent>
                {availableCollections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sourceCollectionId && (
            <>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleSelectAll}
                  disabled={filteredItems.length === 0}
                >
                  {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  onClick={() => handleImport(true)}
                  disabled={filteredItems.length === 0 || importItemsMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {importItemsMutation.isPending ? 'Importing...' : `Import All (${filteredItems.length})`}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto border rounded-lg">
                {filteredItems.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {sourceItems.length === 0 ? 'No items in this list' : 'No items match your search'}
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredItems.map((item) => {
                      const cbId = `import-item-${item.id}`;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleItemToggle(item.id)}
                        >
                          <Checkbox
                            id={cbId}
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => handleItemToggle(item.id)}
                          />
                          <Label htmlFor={cbId} className="flex-1 min-w-0 cursor-pointer">
                            <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {[
                                { key: "Key", value: item.key },
                                { key: "Composer", value: item.composer },
                                { key: "Style", value: item.style },
                              ]
                                .filter(tag => tag.value?.trim())
                                .map(({ key, value }) => (
                                  <Badge key={key} variant="secondary" className="text-xs">
                                    {key}: {value}
                                  </Badge>
                                ))}
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedItems.size > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={resetAndClose} className="text-gray-900 dark:text-gray-100">
            Cancel
          </Button>
          <Button
            onClick={() => handleImport(false)}
            disabled={selectedItems.size === 0 || importItemsMutation.isPending}
            className="text-gray-900 dark:text-gray-100"
          >
            {importItemsMutation.isPending ? 'Importing...' : `Import ${selectedItems.size} Items`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

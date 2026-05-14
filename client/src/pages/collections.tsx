import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ResponsiveLayout from "@/components/responsive-layout";
import CollectionList from "@/components/collection-list";
import ItemList from "@/components/item-list";
import FilterBar from "@/components/filter-bar";
import AddItemModal from "@/components/add-item-modal";
import AddCollectionModal from "@/components/add-collection-modal";
import EditItemModal from "@/components/edit-item-modal";
import FilterModal from "@/components/filter-modal";
import BulkImportModal from "@/components/bulk-import-modal";
import ImportItemsModal from "@/components/import-items-modal";
import EditCollectionModal from "@/components/edit-collection-modal";
import { type CollectionWithCount, type Item } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Copy, Layers, Plus, Upload } from "lucide-react";
import logoImage from "@assets/file_00000000293061f5b6c62d71c7ed0c97_1754724182356.png";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Collections() {
  const { collectionId } = useParams<{ collectionId?: string }>();
  const [, setLocation] = useLocation();
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showImportItems, setShowImportItems] = useState(false);
  const [showEditCollection, setShowEditCollection] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionWithCount | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string | string[]>>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'last-modified' | 'first-modified'>('asc');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { data: collections = [] } = useQuery<CollectionWithCount[]>({
    queryKey: ["/api/collections"],
  });

  const activeCollection = collections.find(c => c.id === collectionId);

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["/api/collections", collectionId, "items"],
    enabled: !!collectionId,
  });

  const filteredItems = useQuery<Item[]>({
    queryKey: ["/api/collections", collectionId, "items", "filtered", { filters: activeFilters, search: searchQuery }],
    queryFn: async () => {
      if (!collectionId) return [];
      const params = new URLSearchParams();
      if (Object.keys(activeFilters).length > 0) {
        params.append('filters', JSON.stringify(activeFilters));
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery);
      }
      const url = `/api/collections/${collectionId}/items${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch filtered items');
      return response.json();
    },
    enabled: !!collectionId && (Object.keys(activeFilters).length > 0 || searchQuery.length > 0),
  });

  const sortItems = (itemsToSort: Item[]) => {
    if (sortOrder === 'asc') {
      return [...itemsToSort].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOrder === 'desc') {
      return [...itemsToSort].sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortOrder === 'last-modified') {
      return [...itemsToSort].sort((a, b) => {
        const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bDate - aDate;
      });
    } else if (sortOrder === 'first-modified') {
      return [...itemsToSort].sort((a, b) => {
        const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return aDate - bDate;
      });
    }
    return itemsToSort;
  };

  const displayItems = sortItems(filteredItems.data || items);

  const sidebarContent = (closeSidebar: () => void) => (
    <>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src={logoImage} alt="FlexList" className="w-8 h-8 object-contain opacity-100" />
            </div>
            <div>
              <h1
                className="text-xl font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                onClick={() => setLocation('/')}
              >
                FlexList
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Smart List Manager</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Lists
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddCollection(true)}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        <CollectionList
          collections={collections}
          activeCollectionId={collectionId}
          onEditCollection={(collection) => {
            setEditingCollection(collection);
            setShowEditCollection(true);
          }}
          onCollectionSelect={closeSidebar}
        />

        <Button
          variant="outline"
          onClick={() => setShowAddCollection(true)}
          className="w-full mt-4 border-dashed border-2 text-gray-900 dark:text-gray-100 hover:border-primary-300 hover:text-primary-600 dark:border-gray-600 dark:hover:border-primary-400 dark:hover:text-primary-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          New List
        </Button>
      </div>
    </>
  );

  const mainContent = (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 mt-4 md:mt-8">
      {activeCollection ? (
        <>
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button onClick={() => setShowAddItem(true)} size="lg" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">
                  <Plus className="w-6 h-6" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBulkImport(true)}
                  className="text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowImportItems(true)}
                  className="text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Import from List
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{activeCollection.name}</h2>
            {activeCollection.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {activeCollection.description}
              </p>
            )}
          </div>

          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeFilters={activeFilters}
            onFilterChange={setActiveFilters}
            onToggleFilters={() => setShowFilters(true)}
          />

          <ItemList
            items={displayItems}
            onEditItem={setEditingItem}
            isLoading={filteredItems.isLoading}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            hasActiveFilters={false}
            expandedItems={expandedItems}
            onToggleExpanded={(itemId) => {
              setExpandedItems(prev => {
                const newSet = new Set(prev);
                if (newSet.has(itemId)) {
                  newSet.delete(itemId);
                } else {
                  newSet.add(itemId);
                }
                return newSet;
              });
            }}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 pt-8 md:pt-16">
          <div className="text-center">
            <img src={logoImage} alt="FlexList" className="w-24 h-24 mx-auto mb-4 opacity-60" style={{ filter: 'none' }} />
            <div className="flex items-center justify-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Welcome to FlexList</h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Select a list from the sidebar
            </p>
            <Button onClick={() => setShowAddCollection(true)} className="text-gray-900 dark:text-gray-100">
              <Plus className="w-4 h-4 mr-2" />
              Create a List
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <ResponsiveLayout sidebar={sidebarContent}>
        {mainContent}
      </ResponsiveLayout>

      <AddItemModal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        collectionId={collectionId || ""}
      />

      <BulkImportModal
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        collectionId={collectionId || ""}
      />

      <ImportItemsModal
        isOpen={showImportItems}
        onClose={() => setShowImportItems(false)}
        targetCollectionId={collectionId || ""}
      />

      <AddCollectionModal
        isOpen={showAddCollection}
        onClose={() => setShowAddCollection(false)}
      />

      {editingItem && (
        <EditItemModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          item={editingItem}
        />
      )}

      <FilterModal
        open={showFilters}
        onOpenChange={setShowFilters}
        collectionId={collectionId || ""}
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
      />

      {editingCollection && (
        <EditCollectionModal
          isOpen={showEditCollection}
          onClose={() => {
            setShowEditCollection(false);
            setEditingCollection(null);
          }}
          collection={editingCollection}
        />
      )}
    </>
  );
}

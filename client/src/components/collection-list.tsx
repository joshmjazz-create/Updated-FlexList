import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type CollectionWithCount } from "@shared/schema";

interface CollectionListProps {
  collections: CollectionWithCount[];
  activeCollectionId?: string;
  onEditCollection?: (collection: CollectionWithCount) => void;
  onCollectionSelect?: () => void;
}

export default function CollectionList({ collections, activeCollectionId, onEditCollection, onCollectionSelect }: CollectionListProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/collections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({
        title: "Success",
        description: "List deleted successfully",
      });
      if (activeCollectionId) {
        setLocation("/");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete list",
        variant: "destructive",
      });
    },
  });

  const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this list? All items will be removed.")) {
      deleteCollectionMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-2">
      {collections.map((collection) => {
        const count = (collection as any).count ?? (collection as any).itemCount ?? 0;
        return (
          <div
            key={collection.id}
            className={`rounded-lg p-3 cursor-pointer transition-colors ${
              collection.id === activeCollectionId
                ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700"
                : "border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            onClick={() => {
              setLocation(`/collections/${collection.id}`);
              onCollectionSelect?.();
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className={`font-medium ${
                    collection.id === activeCollectionId
                      ? "text-primary-900 dark:text-primary-100"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {collection.name}
                </h3>
                <p
                  className={`text-xs mt-1 ${
                    collection.id === activeCollectionId
                      ? "text-primary-600 dark:text-primary-300"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {count} {count === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-1 ${
                    collection.id === activeCollectionId
                      ? "text-primary-400 hover:text-primary-600"
                      : "text-gray-400 hover:text-primary-600"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEditCollection) {
                      onEditCollection(collection);
                    }
                  }}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-1 ${
                    collection.id === activeCollectionId
                      ? "text-primary-400 hover:text-red-500"
                      : "text-gray-400 hover:text-red-500"
                  }`}
                  onClick={(e) => handleDeleteCollection(collection.id, e)}
                  disabled={deleteCollectionMutation.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

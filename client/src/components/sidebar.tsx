import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface SidebarProps {
  children: React.ReactNode;
  onAddCollection: () => void;
}

export default function Sidebar({ children, onAddCollection }: SidebarProps) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-layer-group text-white text-sm"></i>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">FlexList</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Smart Collection Manager</p>
      </div>

      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            Collections
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddCollection}
            className="p-1 text-gray-400 hover:text-primary-600"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        {children}

        <Button
          variant="outline"
          onClick={onAddCollection}
          className="w-full mt-4 border-dashed border-2 hover:border-primary-300 hover:text-primary-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Collection
        </Button>
      </div>
    </div>
  );
}

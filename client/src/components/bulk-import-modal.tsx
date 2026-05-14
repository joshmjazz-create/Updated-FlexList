import { useId, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, AlertTriangle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Item } from "@shared/schema";

const formSchema = z.object({
  itemsList: z.string().min(1, "Please enter at least one item"),
});

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId?: string;
}

export default function BulkImportModal({ open, onOpenChange, collectionId }: BulkImportModalProps) {
  const [previewItems, setPreviewItems] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const { toast } = useToast();
  const descId = useId();

  const { data: existingItems = [] } = useQuery<Item[]>({
    queryKey: ["/api/collections", collectionId, "items"],
    enabled: !!collectionId && open,
  });

  useEffect(() => {
    if (previewItems.length > 0) {
      generatePreview();
    }
  }, [existingItems]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { itemsList: "" },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (titles: string[]) => {
      const res = await fetch("/api/bulk/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, titles }),
      });
      if (!res.ok) throw new Error("Bulk import failed");
      return res.json() as Promise<{ created: number; skipped: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections", collectionId, "items"] });
      toast({
        title: "Import complete",
        description: `Added ${data.created} item(s). Skipped ${data.skipped} duplicate/empty line(s).`,
      });
      onOpenChange(false);
      form.reset();
      setPreviewItems([]);
      setDuplicates([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import items",
        variant: "destructive",
      });
    },
  });

  const generatePreview = () => {
    const text = form.getValues("itemsList");
    if (!text.trim()) {
      setPreviewItems([]);
      setDuplicates([]);
      return;
    }
    const items = text
      .split("\n")
      .map((line) => {
        let t = line.trim();
        if (t.startsWith("[  ]")) t = t.slice(4).trim();
        return t;
      })
      .filter((t) => t.length > 0)
      .slice(0, 1000);
    setPreviewItems(items);
    const existingTitles = new Set(
      (existingItems as Item[]).map((i) => (i.title || "").toLowerCase())
    );
    setDuplicates(items.filter((t) => existingTitles.has(t.toLowerCase())));
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!collectionId) {
      toast({ title: "Error", description: "Please select a collection first", variant: "destructive" });
      return;
    }
    const titles = data.itemsList
      .split("\n")
      .map((line) => {
        let t = line.trim();
        if (t.startsWith("[  ]")) t = t.slice(4).trim();
        return t;
      })
      .filter((t) => t.length > 0)
      .slice(0, 1000);
    bulkImportMutation.mutate(titles);
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setPreviewItems([]);
    setDuplicates([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={descId}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Import Items
          </DialogTitle>
          <DialogDescription id={descId}>
            Paste one title per line (up to 1000). Duplicates are skipped automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Form {...form}>
            <FormField
              control={form.control}
              name="itemsList"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="items-list">Items List</FormLabel>
                  <FormControl>
                    <Textarea
                      id="items-list"
                      placeholder={`Enter one item per line, for example:
Misty
Autumn Leaves
Blue Moon
All of Me
Summertime`}
                      rows={10}
                      className="font-mono text-sm"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setTimeout(generatePreview, 100);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>

          {previewItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="w-4 h-4" />
                Preview ({previewItems.length} items)
              </div>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {previewItems.slice(0, 20).map((item, index) => (
                    <Badge key={index} variant="secondary" className="bg-white text-gray-700">
                      {item}
                    </Badge>
                  ))}
                  {previewItems.length > 20 && (
                    <Badge variant="secondary" className="bg-gray-200 text-gray-600">
                      +{previewItems.length - 20} more...
                    </Badge>
                  )}
                </div>
              </div>
              {previewItems.length > 1000 && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  Only the first 1000 items will be imported.
                </div>
              )}
              {duplicates.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <div>
                    <p className="font-medium mb-2">{duplicates.length} duplicate item(s) found in this list and will be skipped.</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {duplicates.slice(0, 5).map((item, index) => (
                        <Badge key={index} variant="destructive" className="bg-red-100 text-red-800 text-xs">
                          {item}
                        </Badge>
                      ))}
                      {duplicates.length > 5 && (
                        <Badge variant="destructive" className="bg-red-100 text-red-800 text-xs">
                          +{duplicates.length - 5} more...
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={bulkImportMutation.isPending || previewItems.length === 0}>
              {bulkImportMutation.isPending ? "Importing..." : `Import ${previewItems.length} Items`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

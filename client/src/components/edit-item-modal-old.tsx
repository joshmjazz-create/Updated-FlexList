import { useState, useEffect, useId } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertItemSchema, type Item } from "@shared/schema";
import { AutocompleteTagInput } from "./autocomplete-tag-input";
import { parseMediaLink } from "@/utils/parseMediaLink";

const formSchema = insertItemSchema.extend({
  tags: z.record(z.string()).optional(),
  mediaUrl: z.string().optional(),
});

interface EditItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item;
}

export default function EditItemModal({ open, onOpenChange, item }: EditItemModalProps) {
  const { toast } = useToast();
  const descId = useId();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      notes: "",
      tags: {},
      collectionId: "",
    },
  });

  useEffect(() => {
    if (item && open) {
      form.reset({
        title: item.title,
        notes: item.notes || "",
        tags: item.tags || {},
        collectionId: item.collectionId,
        mediaUrl: "",
      });
    }
  }, [item, open, form]);

  const updateItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("PUT", `/api/items/${item.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const mediaData = data.mediaUrl ? parseMediaLink(data.mediaUrl) : {
      youtubeId: item.youtubeId,
      spotifyUri: item.spotifyUri,
      startSeconds: item.startSeconds,
    };
    const { mediaUrl, ...submitData } = data;
    updateItemMutation.mutate({
      ...submitData,
      youtubeId: mediaData.youtubeId || null,
      spotifyUri: mediaData.spotifyUri || null,
      startSeconds: mediaData.startSeconds || null,
    });
  };

  const currentTags = form.watch("tags") || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={descId} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription id={descId}>
            Modify the details for this item and click Update to save your changes.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="item-title">Item Title *</FormLabel>
                  <FormControl>
                    <Input id="item-title" placeholder="Enter item title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <AutocompleteTagInput
              tags={currentTags}
              onChange={(tags) => form.setValue("tags", tags)}
              className="space-y-2"
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="item-notes">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      id="item-notes"
                      placeholder="Add any additional notes or comments"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mediaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="media-url">Media URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      id="media-url"
                      placeholder="Paste YouTube or Spotify link here"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateItemMutation.isPending}>
                {updateItemMutation.isPending ? "Updating..." : "Update Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

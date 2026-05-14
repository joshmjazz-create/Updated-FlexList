import { useId } from "react";
import { useState } from "react";
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
import { insertItemSchema } from "@shared/schema";
import { AutocompleteTagInput } from "./autocomplete-tag-input";
import { parseMediaLink } from "@/utils/parseMediaLink";

const formSchema = insertItemSchema.extend({
  tags: z.record(z.string()).optional(),
  mediaUrl: z.string().optional(),
});

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId?: string;
}

export default function AddItemModal({ open, onOpenChange, collectionId }: AddItemModalProps) {
  const { toast } = useToast();
  const [descId] = useState(() => `desc-${Math.random().toString(36).slice(2)}`);
  const titleId = useId();
  const notesId = useId();
  const mediaId = useId();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      notes: "",
      tags: {},
      mediaUrl: "",
      collectionId: collectionId || "",
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/items", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({
        title: "Success",
        description: "Item added successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!collectionId) {
      toast({
        title: "Error",
        description: "Please select a collection first",
        variant: "destructive",
      });
      return;
    }
    const mediaData = data.mediaUrl ? parseMediaLink(data.mediaUrl) : {};
    const { mediaUrl, ...submitData } = data;
    createItemMutation.mutate({
      ...submitData,
      collectionId,
      youtubeId: mediaData.youtubeId || null,
      spotifyUri: mediaData.spotifyUri || null,
      startSeconds: mediaData.startSeconds || null,
    });
  };

  const currentTags = form.watch("tags") || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={descId}>
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription id={descId}>
            Enter the details below to add a new item to this list.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={titleId}>Item Title *</FormLabel>
                  <FormControl>
                    <Input id={titleId} placeholder="Enter item title" {...field} />
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
                  <FormLabel htmlFor={notesId}>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      id={notesId}
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
                  <FormLabel htmlFor={mediaId}>Media URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      id={mediaId}
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
              <Button type="submit" disabled={createItemMutation.isPending}>
                {createItemMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

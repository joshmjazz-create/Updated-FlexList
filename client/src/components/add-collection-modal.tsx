import { useId } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { insertCollectionSchema } from "@shared/schema";

interface AddCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCollectionModal({ isOpen, onClose }: AddCollectionModalProps) {
  const { toast } = useToast();
  const descId = useId();
  const nameId = useId();
  const descriptionId = useId();

  const form = useForm({
    resolver: zodResolver(insertCollectionSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createCollectionMutation = useMutation({
    mutationFn: async (data: typeof insertCollectionSchema._type) => {
      const response = await apiRequest("POST", "/api/collections", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({
        title: "Success",
        description: "List created successfully",
      });
      onClose();
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create list",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: typeof insertCollectionSchema._type) => {
    createCollectionMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={descId}>
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
          <DialogDescription id={descId}>
            Name your list and optionally add a short description.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={nameId}>List Name *</FormLabel>
                  <FormControl>
                    <Input id={nameId} placeholder="Enter list name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={descriptionId}>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      id={descriptionId}
                      placeholder="Describe what this list is for"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-gray-900 dark:text-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCollectionMutation.isPending}
                className="text-gray-900 dark:text-gray-100"
              >
                {createCollectionMutation.isPending ? "Creating..." : "Create List"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirmDelete: () => void;
  itemName?: string;
}

export default function DeleteExpenseDialog({
  isOpen,
  onOpenChange,
  onConfirmDelete,
  itemName = "this item"
}: DeleteExpenseDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-xl max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Delete Expense?</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            This will permanently delete "{itemName}". This action cannot be undone.
          </AlertDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" className="h-10 flex-1">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 flex-1" asChild>
            <Button>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

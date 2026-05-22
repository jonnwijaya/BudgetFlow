'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EXPENSE_CATEGORIES } from '@/types';

interface ImportInfoDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function ImportInfoDialog({ isOpen, onOpenChange }: ImportInfoDialogProps) {
  const validCategoriesString = EXPENSE_CATEGORIES.join(", ");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col w-[92vw] max-w-lg max-h-[85dvh] p-0 rounded-xl">
        <DialogHeader className="p-5 pb-3 border-b flex-shrink-0">
          <DialogTitle className="text-base">CSV Import Instructions</DialogTitle>
          <DialogDescription className="text-xs">
            Follow these guidelines to successfully import your expenses.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-5 py-4 space-y-4 text-sm">
          <p>
            Your CSV file <strong className="text-primary">must include a header row</strong> with the following columns:
          </p>
          <ul className="list-disc list-inside pl-2 space-y-1 text-xs">
            <li><code className="bg-muted px-1 py-0.5 rounded text-[10px]">Date</code> — expense date</li>
            <li><code className="bg-muted px-1 py-0.5 rounded text-[10px]">Category</code> — must be one of: {validCategoriesString}</li>
            <li><code className="bg-muted px-1 py-0.5 rounded text-[10px]">Description</code> — brief text</li>
            <li><code className="bg-muted px-1 py-0.5 rounded text-[10px]">Amount</code> — positive number, no currency symbol</li>
          </ul>

          <h3 className="font-semibold text-sm mt-2">Date Formats</h3>
          <p className="text-xs">Accepted: <code className="bg-muted px-1 rounded text-[10px]">YYYY-MM-DD</code>, <code className="bg-muted px-1 rounded text-[10px]">MM/DD/YYYY</code>, <code className="bg-muted px-1 rounded text-[10px]">DD/MM/YYYY</code></p>

          <h3 className="font-semibold text-sm mt-2">Example</h3>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs">2023-01-15</TableCell>
                  <TableCell className="text-xs">Food</TableCell>
                  <TableCell className="text-xs">Groceries</TableCell>
                  <TableCell className="text-xs">55.20</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">01/20/2023</TableCell>
                  <TableCell className="text-xs">Transportation</TableCell>
                  <TableCell className="text-xs">Bus fare</TableCell>
                  <TableCell className="text-xs">2.75</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Invalid rows will be skipped during import.
          </p>
        </div>

        <DialogFooter className="p-5 pt-3 border-t flex-shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-10 w-full">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

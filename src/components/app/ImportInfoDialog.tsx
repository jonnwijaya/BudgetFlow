
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
      <DialogContent className="flex flex-col w-[90vw] max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>CSV Import Instructions</DialogTitle>
          <DialogDescription>
            Follow these guidelines to successfully import your expenses via CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4 text-sm">
          <p>
            Your CSV file <strong className="text-primary">must include a header row</strong> with the following column names (case-insensitive):
          </p>
          <ul className="list-disc list-inside pl-4 space-y-1">
            <li><code className="bg-muted px-1 py-0.5 rounded">Date</code>: The date of the expense.</li>
            <li><code className="bg-muted px-1 py-0.5 rounded">Category</code>: The expense category.</li>
            <li><code className="bg-muted px-1 py-0.5 rounded">Description</code>: A brief description of the expense.</li>
            <li><code className="bg-muted px-1 py-0.5 rounded">Amount</code>: The monetary value of the expense (must be a positive number).</li>
          </ul>
          <p>An optional <code className="bg-muted px-1 py-0.5 rounded">ID</code> column will be ignored if present.</p>

          <h3 className="font-semibold text-md mt-3 text-primary">Data Formatting:</h3>
          <ul className="list-disc list-inside pl-4 space-y-1">
            <li>
              <strong>Date:</strong> Accepted formats include <code className="bg-muted px-1 py-0.5 rounded">YYYY-MM-DD</code> (e.g., 2023-12-31), <code className="bg-muted px-1 py-0.5 rounded">MM/DD/YYYY</code> (e.g., 12/31/2023), <code className="bg-muted px-1 py-0.5 rounded">DD/MM/YYYY</code> (e.g., 31/12/2023), or <code className="bg-muted px-1 py-0.5 rounded">YYYY/MM/DD</code> (e.g., 2023/12/31).
            </li>
            <li>
              <strong>Category:</strong> Must be one of the following predefined categories: {validCategoriesString}.
            </li>
            <li>
              <strong>Amount:</strong> Should be a number (e.g., 25.99). Do not include currency symbols.
            </li>
            <li>
              <strong>Description:</strong> Should be plain text. If your description contains commas, ensure it is enclosed in double quotes (e.g., <code className="bg-muted px-1 py-0.5 rounded">"Lunch, with friends"</code>).
            </li>
          </ul>

          <h3 className="font-semibold text-md mt-3 text-primary">Example CSV Content:</h3>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>2023-01-15</TableCell>
                  <TableCell>Food</TableCell>
                  <TableCell>Groceries</TableCell>
                  <TableCell>55.20</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>01/20/2023</TableCell>
                  <TableCell>Transportation</TableCell>
                  <TableCell>Bus fare</TableCell>
                  <TableCell>2.75</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2023-02-01</TableCell>
                  <TableCell>Shopping</TableCell>
                  <TableCell>"New headphones, blue"</TableCell>
                  <TableCell>129.99</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Rows with invalid data (e.g., incorrect category, invalid date format, non-positive amount) will be skipped during import.
          </p>
        </div>
        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

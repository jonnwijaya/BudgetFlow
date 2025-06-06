
'use client';

import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FooterProps {
  onExportClick: () => void;
  onImportClick: (file: File) => void; // New prop for import handler
}

export default function AppFooter({ onExportClick, onImportClick }: FooterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportClick(file);
      // Reset file input to allow importing the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <footer className="bg-card border-t mt-auto p-3 sm:p-4">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={onExportClick} variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export Summary
            <span className="hidden md:inline ml-1">(CSV)</span>
          </Button>
          <Button onClick={handleImportButtonClick} variant="outline" size="sm" className="w-full sm:w-auto">
            <Upload className="mr-2 h-4 w-4" />
            Import Expenses
            <span className="hidden md:inline ml-1">(CSV)</span>
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
            aria-hidden="true"
          />
        </div>
        <p className="text-xs text-muted-foreground text-center sm:text-right mt-2 sm:mt-0">
          BudgetFlow &copy; {new Date().getFullYear()}. For informational purposes only.
        </p>
      </div>
    </footer>
  );
}

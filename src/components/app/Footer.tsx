
'use client';

import { useRef, useState } from 'react';
import { Download, Upload, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

const ImportInfoDialog = dynamic(() => import('./ImportInfoDialog'), { ssr: false });

interface FooterProps {
  onExportClick: () => void;
  onImportClick: (file: File) => void; 
}

export default function AppFooter({ onExportClick, onImportClick }: FooterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  const handleImportButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportClick(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <footer className="bg-card border-t mt-auto p-3 sm:p-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={onExportClick} variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Export Summary
              <span className="hidden md:inline ml-1">(CSV)</span>
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={handleImportButtonClick} variant="outline" size="sm" className="flex-grow sm:flex-grow-0">
                <Upload className="mr-2 h-4 w-4" />
                Import Expenses
                <span className="hidden md:inline ml-1">(CSV)</span>
              </Button>
              <Button 
                onClick={() => setIsInfoDialogOpen(true)} 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 sm:h-9 sm:w-9 shrink-0" 
                aria-label="Import CSV Information"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
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
      {isInfoDialogOpen && <ImportInfoDialog isOpen={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen} />}
    </>
  );
}


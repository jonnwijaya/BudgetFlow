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
      <footer className="border-t bg-card mt-auto safe-area-inset-bottom">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button onClick={onExportClick} variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button onClick={handleImportButtonClick} variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              <Button
                onClick={() => setIsInfoDialogOpen(true)}
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="Import CSV Information"
              >
                <Info className="h-4 w-4" />
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
            <p className="text-[10px] text-muted-foreground">
              BudgetFlow &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
      {isInfoDialogOpen && <ImportInfoDialog isOpen={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen} />}
    </>
  );
}

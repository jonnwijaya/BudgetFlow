import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FooterProps {
  onExportClick: () => void;
}

export default function AppFooter({ onExportClick }: FooterProps) {
  return (
    <footer className="bg-card border-t mt-auto p-4">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button onClick={onExportClick} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Summary (CSV)
        </Button>
        <p className="text-xs text-muted-foreground text-center sm:text-right">
          BudgetFlow &copy; {new Date().getFullYear()}. Financial advice provided is for informational purposes only.
        </p>
      </div>
    </footer>
  );
}

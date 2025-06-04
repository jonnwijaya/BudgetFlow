import { cn } from '@/lib/utils';

interface AdPlaceholderProps {
  id: string;
  className?: string;
  label?: string;
  height?: string;
}

export default function AdPlaceholder({ id, className, label, height = 'h-24' }: AdPlaceholderProps) {
  return (
    <div
      id={id}
      className={cn(
        'bg-muted/50 border border-dashed border-muted-foreground rounded-md flex items-center justify-center text-muted-foreground text-sm',
        height,
        className
      )}
      aria-label={`Advertisement slot: ${label || id}`}
    >
      <p>{label || `Ad Slot - ${id}`}</p>
    </div>
  );
}

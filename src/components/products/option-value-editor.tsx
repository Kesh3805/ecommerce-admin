import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface OptionValueEditorProps {
  values: string[];
  onChange: (values: string[]) => void;
}

export function OptionValueEditor({ values, onChange }: OptionValueEditorProps) {
  const addFromInput = (rawValues: string) => {
    const parsedValues = rawValues
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    onChange(Array.from(new Set([...values, ...parsedValues])));
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="Black, White"
        onBlur={(event) => {
          if (event.target.value.trim()) {
            addFromInput(event.target.value);
            event.target.value = '';
          }
        }}
      />
      <div className="flex flex-wrap gap-1">
        {values.map((value) => (
          <Badge key={value} variant="outline" className="gap-1 pr-1">
            <span>{value}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => onChange(values.filter((item) => item !== value))}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

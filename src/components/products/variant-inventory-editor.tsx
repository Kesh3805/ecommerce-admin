import { Input } from '@/components/ui/input';

interface VariantInventoryEditorProps {
  value: number;
  onChange: (value: number) => void;
}

export function VariantInventoryEditor({ value, onChange }: VariantInventoryEditorProps) {
  return (
    <Input
      type="number"
      min={0}
      value={value}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      className="w-24"
    />
  );
}

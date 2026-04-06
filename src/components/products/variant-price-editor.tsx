import { Input } from '@/components/ui/input';

interface VariantPriceEditorProps {
  value: number;
  onChange: (value: number) => void;
}

export function VariantPriceEditor({ value, onChange }: VariantPriceEditorProps) {
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

import { OptionGroup, VariantRow } from '@/components/products/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { VariantPriceEditor } from '@/components/products/variant-price-editor';
import { VariantInventoryEditor } from '@/components/products/variant-inventory-editor';

interface VariantTableProps {
  optionGroups: OptionGroup[];
  rows: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
}

export function VariantTable({ optionGroups, rows, onChange }: VariantTableProps) {
  const editableOptionGroups = optionGroups.filter((group) => group.name.trim().length > 0);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No variants generated yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {editableOptionGroups.map((group) => (
            <TableHead key={group.id}>{group.name}</TableHead>
          ))}
          <TableHead>Price</TableHead>
          <TableHead>Inventory</TableHead>
          <TableHead>SKU</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            {editableOptionGroups.map((group) => (
              <TableCell key={group.id}>{row.options[group.name] || '—'}</TableCell>
            ))}
            <TableCell>
              <VariantPriceEditor
                value={row.price}
                onChange={(price) => onChange(rows.map((item) => (item.id === row.id ? { ...item, price } : item)))}
              />
            </TableCell>
            <TableCell>
              <VariantInventoryEditor
                value={row.inventory}
                onChange={(inventory) =>
                  onChange(rows.map((item) => (item.id === row.id ? { ...item, inventory } : item)))
                }
              />
            </TableCell>
            <TableCell>
              <Input
                value={row.sku}
                onChange={(event) =>
                  onChange(rows.map((item) => (item.id === row.id ? { ...item, sku: event.target.value } : item)))
                }
                className="w-36"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

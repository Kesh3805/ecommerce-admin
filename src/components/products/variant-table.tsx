import { OptionGroup, VariantRow } from '@/components/products/types';
import { Trash2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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
          <TableHead>Policy</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead className="w-16">Delete</TableHead>
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
              <Select
                value={row.inventoryPolicy}
                onValueChange={(inventoryPolicy) => {
                  if (!inventoryPolicy) {
                    return;
                  }

                  onChange(
                    rows.map((item) =>
                      item.id === row.id
                        ? { ...item, inventoryPolicy: inventoryPolicy as 'DENY' | 'CONTINUE' }
                        : item,
                    ),
                  );
                }}
              >
                <SelectTrigger className="w-30">
                  <SelectValue placeholder="Policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DENY">Deny</SelectItem>
                  <SelectItem value="CONTINUE">Continue</SelectItem>
                </SelectContent>
              </Select>
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
            <TableCell>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
                aria-label="Delete variant row"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

import { Wand2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OptionGroup, VariantRow } from '@/components/products/types';
import { OptionGroupEditor } from '@/components/products/option-group-editor';
import { VariantTable } from '@/components/products/variant-table';

interface ProductVariantsEditorProps {
  optionGroups: OptionGroup[];
  onOptionGroupsChange: (groups: OptionGroup[]) => void;
  variants: VariantRow[];
  onVariantsChange: (variants: VariantRow[]) => void;
}

function toSkuPart(input: string) {
  return input.trim().replace(/\s+/g, '-').toUpperCase().slice(0, 5);
}

export function ProductVariantsEditor({
  optionGroups,
  onOptionGroupsChange,
  variants,
  onVariantsChange,
}: ProductVariantsEditorProps) {
  const generateVariants = () => {
    const normalizedGroups = optionGroups
      .map((group) => ({
        ...group,
        name: group.name.trim(),
        values: group.values.filter((value) => value.trim().length > 0),
      }))
      .filter((group) => group.name.length > 0 && group.values.length > 0);

    if (normalizedGroups.length === 0) {
      onVariantsChange([]);
      return;
    }

    let combinations: Record<string, string>[] = [{}];

    for (const group of normalizedGroups) {
      combinations = combinations.flatMap((combination) =>
        group.values.map((value) => ({
          ...combination,
          [group.name]: value,
        }))
      );
    }

    const nextVariants: VariantRow[] = combinations.map((options, index) => {
      const sku = Object.values(options)
        .map((value) => toSkuPart(value))
        .join('-');

      return {
        id: crypto.randomUUID(),
        options,
        sku: `${sku}-${index + 1}`,
        price: 399,
        inventory: 20,
      };
    });

    onVariantsChange(nextVariants);
  };

  return (
    <div className="space-y-6">
      <OptionGroupEditor groups={optionGroups} onChange={onOptionGroupsChange} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Variant Table</CardTitle>
              <CardDescription>Generate cartesian combinations for all option values.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={generateVariants}>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate variants
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <VariantTable optionGroups={optionGroups} rows={variants} onChange={onVariantsChange} />
        </CardContent>
      </Card>
    </div>
  );
}

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
  suggestedOptionGroups?: Array<{ name: string; values: string[] }>;
}

function toSkuPart(input: string) {
  return input.trim().replace(/\s+/g, '-').toUpperCase().slice(0, 5);
}

export function ProductVariantsEditor({
  optionGroups,
  onOptionGroupsChange,
  variants,
  onVariantsChange,
  suggestedOptionGroups = [],
}: ProductVariantsEditorProps) {
  const applyCategoryTemplate = () => {
    const normalizedTemplates = suggestedOptionGroups
      .map((template) => ({
        id: crypto.randomUUID(),
        name: template.name.trim(),
        values: [...new Set(template.values.map((value) => value.trim()).filter((value) => value.length > 0))],
      }))
      .filter((template) => template.name.length > 0 && template.values.length > 0)
      .slice(0, 3);

    onOptionGroupsChange(normalizedTemplates);
    onVariantsChange([]);
  };

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
        inventoryPolicy: 'DENY',
        mediaUrls: [],
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={applyCategoryTemplate}
                disabled={suggestedOptionGroups.length === 0}
                title={suggestedOptionGroups.length === 0 ? 'No category option template available' : 'Apply category template'}
              >
                Use category template
              </Button>
              <Button type="button" variant="outline" onClick={generateVariants}>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate variants
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <VariantTable optionGroups={optionGroups} rows={variants} onChange={onVariantsChange} />
        </CardContent>
      </Card>
    </div>
  );
}

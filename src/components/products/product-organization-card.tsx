import { FieldValues, UseFormRegister } from 'react-hook-form';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategoryOption } from '@/components/products/types';

interface ProductOrganizationCardProps {
  register: UseFormRegister<FieldValues>;
  categoryId: string;
  categories: CategoryOption[];
  onCategoryChange: (id: string) => void;
  brandSuggestions?: string[];
  onBrandSelect?: (brand: string) => void;
}

export function ProductOrganizationCard({
  register,
  categoryId,
  categories,
  onCategoryChange,
  brandSuggestions = [],
  onBrandSelect,
}: ProductOrganizationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" list="brand-options" placeholder="Acme" {...register('brand')} />
          {brandSuggestions.length > 0 ? (
            <>
              <datalist id="brand-options">
                {brandSuggestions.map((brand) => (
                  <option key={brand} value={brand} />
                ))}
              </datalist>
              <div className="max-h-24 overflow-auto rounded-md border bg-muted/20 p-2">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Saved Brands</p>
                <div className="flex flex-wrap gap-1.5">
                  {brandSuggestions.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => onBrandSelect?.(brand)}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No saved brands yet for this store.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={categoryId}
            onValueChange={(value) => {
              if (value) onCategoryChange(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input id="tags" placeholder="summer, cotton, casual" {...register('tags')} />
        </div>
      </CardContent>
    </Card>
  );
}

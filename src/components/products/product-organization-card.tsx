import { useMemo } from 'react';
import { UseFormRegister } from 'react-hook-form';

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
import { CategoryOption, ProductEditorFormValues } from '@/components/products/types';

const UNSELECTED_CATEGORY_VALUE = '__unselected__';
const NO_BRAND_VALUE = '__none__';

interface ProductOrganizationCardProps {
  register: UseFormRegister<ProductEditorFormValues>;
  categoryId: string;
  categories: CategoryOption[];
  onCategoryChange: (id: string) => void;
  brandValue: string;
  onBrandChange: (brand: string) => void;
  brandSuggestions?: string[];
}

export function ProductOrganizationCard({
  register,
  categoryId,
  categories,
  onCategoryChange,
  brandValue,
  onBrandChange,
  brandSuggestions = [],
}: ProductOrganizationCardProps) {
  const selectableCategories = useMemo(
    () => categories.filter((category) => category.id !== '__none__'),
    [categories],
  );

  const categoryById = useMemo(
    () => new Map(selectableCategories.map((category) => [category.id, category])),
    [selectableCategories],
  );

  const childrenByParentId = useMemo(() => {
    const grouped = new Map<string | null, CategoryOption[]>();

    for (const category of selectableCategories) {
      const normalizedParentId = category.parentId && categoryById.has(category.parentId)
        ? category.parentId
        : null;
      const siblings = grouped.get(normalizedParentId) ?? [];
      siblings.push(category);
      grouped.set(normalizedParentId, siblings);
    }

    for (const [parentId, siblings] of grouped.entries()) {
      grouped.set(parentId, [...siblings].sort((left, right) => left.label.localeCompare(right.label)));
    }

    return grouped;
  }, [categoryById, selectableCategories]);

  const selectedPath = useMemo(() => {
    if (!categoryId || categoryId === '__none__' || !categoryById.has(categoryId)) {
      return [] as string[];
    }

    const path: string[] = [];
    const visited = new Set<string>();
    let currentId: string | null = categoryId;

    while (currentId && categoryById.has(currentId) && !visited.has(currentId)) {
      visited.add(currentId);
      path.push(currentId);
      const currentCategory = categoryById.get(currentId) as CategoryOption;
      currentId = currentCategory.parentId && categoryById.has(currentCategory.parentId) ? currentCategory.parentId : null;
    }

    return path.reverse();
  }, [categoryById, categoryId]);

  const categoryLevels = useMemo(() => {
    const levels: CategoryOption[][] = [];
    levels.push(childrenByParentId.get(null) ?? []);

    for (const selectedId of selectedPath) {
      const children = childrenByParentId.get(selectedId) ?? [];
      if (children.length === 0) {
        break;
      }

      levels.push(children);
    }

    return levels;
  }, [childrenByParentId, selectedPath]);

  const handleCategoryLevelChange = (levelIndex: number, value: string): void => {
    if (value === '__none__') {
      onCategoryChange('__none__');
      return;
    }

    if (value === UNSELECTED_CATEGORY_VALUE) {
      const fallbackId = levelIndex > 0 ? selectedPath[levelIndex - 1] : '__none__';
      onCategoryChange(fallbackId || '__none__');
      return;
    }

    onCategoryChange(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <input type="hidden" {...register('brand')} />
          <Select
            value={brandValue.trim().length > 0 ? brandValue : NO_BRAND_VALUE}
            onValueChange={(value) => {
              const normalized = !value || value === NO_BRAND_VALUE ? '' : value;
              onBrandChange(normalized);
            }}
          >
            <SelectTrigger id="brand" className="w-full">
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_BRAND_VALUE}>No brand</SelectItem>
              {brandSuggestions.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {brandSuggestions.length === 0 && (
            <p className="text-xs text-muted-foreground">No saved brands yet for this store.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <div className="space-y-2">
            {categoryLevels.map((levelCategories, levelIndex) => {
              const selectedValue = levelIndex === 0
                ? (categoryId === '__none__' ? '__none__' : selectedPath[levelIndex] ?? UNSELECTED_CATEGORY_VALUE)
                : (selectedPath[levelIndex] ?? UNSELECTED_CATEGORY_VALUE);

              return (
                <div key={`category-level-${levelIndex}`} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {levelIndex === 0 ? 'Parent Category' : `Subcategory Level ${levelIndex + 1}`}
                  </Label>
                  <Select
                    value={selectedValue}
                    onValueChange={(value) => {
                      if (value) {
                        handleCategoryLevelChange(levelIndex, value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={levelIndex === 0 ? 'Select parent category' : 'Select subcategory'} />
                    </SelectTrigger>
                    <SelectContent>
                      {levelIndex === 0 ? (
                        <>
                          <SelectItem value="__none__">No category</SelectItem>
                          <SelectItem value={UNSELECTED_CATEGORY_VALUE}>Select parent category</SelectItem>
                        </>
                      ) : (
                        <SelectItem value={UNSELECTED_CATEGORY_VALUE}>Keep parent selection</SelectItem>
                      )}
                      {levelCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input id="tags" placeholder="summer, cotton, casual" {...register('tags')} />
        </div>
      </CardContent>
    </Card>
  );
}

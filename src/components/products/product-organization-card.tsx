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
import { CategoryOption } from '@/components/products/types';

interface ProductOrganizationCardProps {
  register: UseFormRegister<any>;
  categoryId: string;
  categories: CategoryOption[];
  onCategoryChange: (id: string) => void;
}

export function ProductOrganizationCard({
  register,
  categoryId,
  categories,
  onCategoryChange,
}: ProductOrganizationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" placeholder="Acme" {...register('brand')} />
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

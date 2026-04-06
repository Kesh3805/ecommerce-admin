import { UseFormRegister } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProductSEOCardProps {
  register: UseFormRegister<any>;
}

export function ProductSEOCard({ register }: ProductSEOCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO</CardTitle>
        <CardDescription>Control search title, description, and URL handle.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="seoTitle">Page Title</Label>
          <Input id="seoTitle" placeholder="SEO title" {...register('seoTitle')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="seoDescription">Meta Description</Label>
          <Textarea id="seoDescription" placeholder="Meta description" rows={3} {...register('seoDescription')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="seoHandle">Handle</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">/products/</span>
            <Input id="seoHandle" placeholder="short-sleeve-t-shirt" {...register('seoHandle')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

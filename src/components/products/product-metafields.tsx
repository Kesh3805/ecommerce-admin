import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CategoryMetafield } from '@/components/products/types';

interface ProductMetafieldsProps {
  fields: CategoryMetafield[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function ProductMetafields({ fields, values, onChange }: ProductMetafieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Metafields</CardTitle>
        <CardDescription>Dynamic attributes based on selected category metadata.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">Select a category to load metafields.</p>
        ) : (
          fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.key}
                  rows={3}
                  value={values[field.key] || ''}
                  onChange={(event) => onChange(field.key, event.target.value)}
                />
              ) : (
                <Input
                  id={field.key}
                  value={values[field.key] || ''}
                  onChange={(event) => onChange(field.key, event.target.value)}
                />
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

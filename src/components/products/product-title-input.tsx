import { FieldError, UseFormRegister } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProductTitleInputProps {
  register: UseFormRegister<any>;
  error?: FieldError;
}

export function ProductTitleInput({ register, error }: ProductTitleInputProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Title</CardTitle>
        <CardDescription>Start with a clear product name customers can search for.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" placeholder="Short sleeve t-shirt" {...register('title')} />
        {error && <p className="text-sm text-destructive">{error.message}</p>}
      </CardContent>
    </Card>
  );
}

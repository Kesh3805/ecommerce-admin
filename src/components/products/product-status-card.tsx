import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductStatus } from '@/components/products/types';

interface ProductStatusCardProps {
  status: ProductStatus;
  onChange: (status: ProductStatus) => void;
}

export function ProductStatusCard({ status, onChange }: ProductStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Select
          value={status}
          onValueChange={(value) => {
            if (value) onChange(value as ProductStatus);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Use Draft while editing and publish when variants and inventory are ready.</p>
      </CardContent>
    </Card>
  );
}

'use client';

import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { Plus, Search, MoreHorizontal } from 'lucide-react';
import { GET_PRODUCTS } from '@/graphql/operations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: number;
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  brand?: string;
  createdAt: string;
  updatedAt: string;
}

interface GetProductsResponse {
  products: {
    items: Product[];
  };
}

function ProductStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    DRAFT: 'secondary',
    ACTIVE: 'default',
    ARCHIVED: 'outline',
  };

  return (
    <Badge variant={variants[status] || 'secondary'}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

function ProductTableSkeleton() {
  return (
    <TableBody>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function ProductsPage() {
  const storeId = Number(process.env.NEXT_PUBLIC_STORE_ID || 1);

  const { data, loading, error } = useQuery<GetProductsResponse>(GET_PRODUCTS, {
    variables: { filter: { store_id: storeId }, pagination: { page: 1, limit: 50 } },
  });

  const products: Product[] = data?.products?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border bg-linear-to-r from-primary/10 via-secondary/30 to-muted px-6 py-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Catalog</p>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/products/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Card className="overflow-hidden bg-card/95">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            {loading ? (
              <ProductTableSkeleton />
            ) : error ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Error loading products. Make sure the backend is running.
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : products.length === 0 ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No products yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href="/admin/products/new" />}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create your first product
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : (
              <TableBody>
                {products.map((product) => {
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md border bg-primary/10 text-primary flex items-center justify-center overflow-hidden">
                            <span className="text-xs font-semibold">PRD</span>
                          </div>
                          <span className="font-medium">{product.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ProductStatusBadge status={product.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.brand || '—'}
                      </TableCell>
                      <TableCell>
                        {new Date(product.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(product.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

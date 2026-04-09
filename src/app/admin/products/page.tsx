'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { Plus, Search, MoreHorizontal, Upload } from 'lucide-react';
import { DELETE_PRODUCT, GET_MY_STORES, GET_PRODUCTS } from '@/graphql/operations';
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: number;
  handle?: string;
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  brand?: string;
  primaryImageUrl?: string;
  mediaUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

interface GetProductsResponse {
  products: {
    items: Product[];
    total: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    page: number;
    totalPages: number;
    limit: number;
  };
}

interface MyStoresResponse {
  myStores: Array<{ store_id: number; name: string }>;
}

type StatusFilter = 'ALL' | 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

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
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: myStoresData, loading: storesLoading } = useQuery<MyStoresResponse>(GET_MY_STORES, {
    fetchPolicy: 'no-cache',
  });
  const currentStoreId = myStoresData?.myStores?.[0]?.store_id;

  const productsVariables = useMemo(() => {
    const normalizedSearch = search.trim();

    return {
      filter: {
        ...(currentStoreId ? { store_id: currentStoreId } : {}),
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(normalizedSearch ? { search: normalizedSearch } : {}),
      },
      pagination: { page, limit },
    };
  }, [currentStoreId, search, statusFilter, page, limit]);

  const { data, loading, error } = useQuery<GetProductsResponse>(GET_PRODUCTS, {
    variables: productsVariables,
    fetchPolicy: 'no-cache',
  });

  const products: Product[] = data?.products?.items || [];
  const pagination = data?.products;

  const [deleteProduct, { loading: deleting }] = useMutation(DELETE_PRODUCT, {
    refetchQueries: [{ query: GET_PRODUCTS, variables: productsVariables }],
  });

  const myStoreName = myStoresData?.myStores?.[0]?.name;

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    await deleteProduct({ variables: { id: productId } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border bg-linear-to-r from-primary/10 via-secondary/30 to-muted px-6 py-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Catalog</p>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog{myStoreName ? ` · ${myStoreName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/products/import" />}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button nativeButton={false} render={<Link href="/admin/products/new" />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden bg-card/95">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              title="Filter by status"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            {loading || storesLoading ? (
              <ProductTableSkeleton />
            ) : error ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Error loading products. Make sure the backend is running.
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : products.length === 0 ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
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
                  const thumbnail = product.primaryImageUrl || product.mediaUrls?.[0];

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={product.title}
                              className="h-10 w-10 rounded-md border object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md border bg-primary/10 text-primary flex items-center justify-center overflow-hidden">
                              <span className="text-xs font-semibold">PRD</span>
                            </div>
                          )}
                          <Link href={`/admin/products/${product.id}`} className="font-medium hover:underline">
                            {product.title}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.handle || '—'}
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
                            <DropdownMenuItem
                              nativeButton={false}
                              render={<Link href={`/admin/products/${product.id}`} />}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              nativeButton={false}
                              render={<Link href={`/admin/products/${product.id}/preview`} />}
                            >
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              disabled={deleting}
                              onClick={() => handleDeleteProduct(product.id)}
                            >
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

          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              {pagination ? `Page ${pagination.page} of ${pagination.totalPages} · ${pagination.total} total` : 'No results'}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination?.hasPreviousPage || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination?.hasNextPage || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

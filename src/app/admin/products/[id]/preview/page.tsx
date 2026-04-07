'use client';
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { use } from 'react';
import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { ArrowLeft, Heart, Search, ShoppingBag, User } from 'lucide-react';

import { GET_PRODUCT, GET_PRODUCT_MEDIA, GET_VARIANTS } from '@/graphql/operations';
import { sanitizeHtml } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductMediaItem {
  id: number;
  url: string;
  altText?: string;
  position: number;
  isCover: boolean;
}

interface ProductOptionValue {
  id: number;
  value: string;
}

interface ProductOption {
  id: number;
  name: string;
  values: ProductOptionValue[];
}

interface ProductVariant {
  id: number;
  title: string;
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  option1_value?: string;
  option2_value?: string;
  option3_value?: string;
  inventory_item?: {
    total_available?: number;
  };
}

interface ProductData {
  id: number;
  title: string;
  description?: string;
  brand?: string;
  status: string;
  options: ProductOption[];
  variants?: ProductVariant[];
}

interface GetProductResponse {
  product: ProductData;
}

interface GetProductMediaResponse {
  productMedia: ProductMediaItem[];
}

function formatCurrency(value?: number) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value));
}

function toAbsoluteMediaUrl(url: string): string {
  if (!url) {
    return url;
  }

  if (/^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  const graphQlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4100/graphql';

  try {
    const origin = new URL(graphQlUrl).origin;
    return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
  } catch {
    return url;
  }
}

export default function ProductPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const productId = Number(id);

  const { data, loading, error } = useQuery<GetProductResponse>(GET_PRODUCT, {
    variables: { id: productId },
  });

  const {
    data: variantsData,
    loading: variantsLoading,
    error: variantsError,
  } = useQuery<{ variants: ProductVariant[] }>(GET_VARIANTS, {
    variables: { productId },
    skip: !Number.isInteger(productId),
  });

  const { data: mediaData } = useQuery<GetProductMediaResponse>(GET_PRODUCT_MEDIA, {
    variables: { productId },
    skip: !Number.isInteger(productId),
  });

  const product = data?.product;
  const variants = useMemo(
    () => variantsData?.variants || product?.variants || [],
    [variantsData?.variants, product?.variants],
  );
  const media = (mediaData?.productMedia || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => ({ ...item, url: toAbsoluteMediaUrl(item.url) }));

  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [selectedValuesByOption, setSelectedValuesByOption] = useState<Record<string, string>>({});

  const selectedVariant = useMemo(() => {
    if (!product) {
      return undefined;
    }

    const hasAnySelection = Object.values(selectedValuesByOption).some((value) => value?.length > 0);
    if (!hasAnySelection) {
      return variants?.[0];
    }

    return variants?.find((variant) => {
      return product.options.every((option, index) => {
        const selectedValue = selectedValuesByOption[option.name];
        if (!selectedValue) {
          return true;
        }

        const variantValue = [variant.option1_value, variant.option2_value, variant.option3_value][index];
        return variantValue === selectedValue;
      });
    });
  }, [product, variants, selectedValuesByOption]);

  const displayImage = media[selectedMediaIndex] || media[0];
  const fallbackImage = `https://placehold.co/900x1100?text=${encodeURIComponent(product?.title || 'No Image')}`;

  if (loading || variantsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-140 w-full" />
          <Skeleton className="h-140 w-full" />
        </div>
      </div>
    );
  }

  if (error || variantsError || !product) {
    return (
      <div className="space-y-4">
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/products" />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Unable to load product preview.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" nativeButton={false} render={<Link href={`/admin/products/${product.id}`} />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">Storefront Preview</span>
          <Badge variant="outline">{product.status}</Badge>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <Search className="h-4 w-4" />
          <Heart className="h-4 w-4" />
          <User className="h-4 w-4" />
          <ShoppingBag className="h-4 w-4" />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[96px_1fr_420px]">
        <div className="space-y-2">
          {media.length > 0 ? (
            media.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={`h-20 w-20 overflow-hidden rounded-md border ${index === selectedMediaIndex ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedMediaIndex(index)}
              >
                <img src={item.url || fallbackImage} alt={item.altText || product.title} className="h-full w-full object-cover" />
              </button>
            ))
          ) : (
            <div className="h-20 w-20 rounded-md border bg-muted overflow-hidden">
              <img src={fallbackImage} alt="fallback" className="h-full w-full object-cover" />
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
          {displayImage ? (
            <img
              src={displayImage.url || fallbackImage}
              alt={displayImage.altText || product.title}
              className="h-full max-h-155 w-full object-cover"
            />
          ) : (
            <img src={fallbackImage} alt={product.title} className="h-full max-h-155 w-full object-cover" />
          )}
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.brand || 'Brand'}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{product.title}</h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-3xl font-bold text-primary">{formatCurrency(selectedVariant?.price)}</span>
              {selectedVariant?.compareAtPrice ? (
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(selectedVariant.compareAtPrice)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              SKU: {selectedVariant?.sku || 'N/A'}
            </p>
            {variants.length === 0 && (
              <p className="mt-2 text-sm text-destructive">No variants configured yet for this product.</p>
            )}
          </div>

          <div className="space-y-4">
            {product.options.map((option) => (
              <div key={option.id} className="space-y-2">
                <p className="text-sm font-medium">{option.name}</p>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const isSelected = selectedValuesByOption[option.name] === value.value;
                    return (
                      <Button
                        key={value.id}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setSelectedValuesByOption((prev) => ({
                            ...prev,
                            [option.name]: value.value,
                          }))
                        }
                      >
                        {value.value}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              Available: {selectedVariant?.inventory_item?.total_available ?? 0}
            </div>
            <Button className="w-full" disabled={!selectedVariant || (selectedVariant.inventory_item?.total_available ?? 0) <= 0}>
              {(selectedVariant?.inventory_item?.total_available ?? 0) > 0 ? 'Add to Cart' : 'Out of Stock'}
            </Button>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Description</h2>
            {product.description ? (
              <div
                className="text-sm leading-6 text-foreground/90 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
              />
            ) : (
              <p className="text-sm leading-6 text-foreground/90">No description available for this product.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

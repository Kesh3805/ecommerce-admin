'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';

import { CREATE_PRODUCT, GET_CATEGORIES, GET_PRODUCTS } from '@/graphql/operations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CategoryOption,
  OptionGroup,
  ProductDescriptionEditor,
  ProductEditorLayout,
  ProductHeader,
  ProductMediaItem,
  ProductMediaUploader,
  ProductMetafields,
  ProductOrganizationCard,
  ProductSEOCard,
  ProductStatus,
  ProductStatusCard,
  ProductTitleInput,
  ProductVariantsEditor,
  VariantRow,
} from '@/components/products';

const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  brand: z.string().optional(),
  categoryId: z.string().optional(),
  tags: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoHandle: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface BackendCategory {
  id: number;
  name: string;
  slug: string;
  metadata?: string | null;
}

interface GetCategoriesResponse {
  categories: BackendCategory[];
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseCategoryMetafields(metadata?: string | null) {
  if (!metadata) return [] as CategoryOption['metafields'];

  try {
    const parsedMetadata = JSON.parse(metadata) as Array<{ key?: string; label?: string; type?: string }>;

    if (!Array.isArray(parsedMetadata)) return [];

    return parsedMetadata
      .filter((item) => item?.key && item?.label)
      .map((item) => ({
        key: String(item.key),
        label: String(item.label),
        type: item.type === 'textarea' ? ('textarea' as const) : ('text' as const),
      })) as CategoryOption['metafields'];
  } catch {
    return [];
  }
}

export default function NewProductPage() {
  const router = useRouter();
  const storeId = Number(process.env.NEXT_PUBLIC_STORE_ID || 1);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      description: '',
      brand: '',
      categoryId: '',
      tags: '',
      seoTitle: '',
      seoDescription: '',
      seoHandle: '',
    },
  });

  const [status, setStatus] = useState<ProductStatus>('DRAFT');
  const [mediaItems, setMediaItems] = useState<ProductMediaItem[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [metafieldValues, setMetafieldValues] = useState<Record<string, string>>({});

  const { data: categoriesData } = useQuery<GetCategoriesResponse>(GET_CATEGORIES, {
    variables: { storeId },
  });

  const categoryOptions: CategoryOption[] = (categoriesData?.categories || []).map((category) => ({
    id: String(category.id),
    label: category.name,
    metafields: parseCategoryMetafields(category.metadata),
  }));

  const selectedCategoryId = useWatch({ control, name: 'categoryId' });
  useEffect(() => {
    if (!selectedCategoryId && categoryOptions.length > 0) {
      setValue('categoryId', categoryOptions[0].id);
    }
  }, [categoryOptions, selectedCategoryId, setValue]);

  const selectedCategory = categoryOptions.find((category) => category.id === selectedCategoryId) || {
    id: '',
    label: 'Uncategorized',
    metafields: [],
  };

  const [createProduct, { loading }] = useMutation<{ createProduct: { id: number } }>(CREATE_PRODUCT, {
    refetchQueries: [{ query: GET_PRODUCTS, variables: { filter: { limit: 50, store_id: storeId } } }],
    onCompleted: () => {
      router.push('/admin/products');
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    const parsedCategoryId = Number(data.categoryId);
    const categoryIds = Number.isFinite(parsedCategoryId) ? [parsedCategoryId] : undefined;
    const computedHandle = data.seoHandle?.trim() || slugify(data.title);

    await createProduct({
      variables: {
        input: {
          title: data.title,
          description: data.description || undefined,
          brand: data.brand || undefined,
          store_id: storeId,
          category_ids: categoryIds,
          seo: {
            handle: computedHandle,
            meta_title: data.seoTitle || undefined,
            meta_description: data.seoDescription || undefined,
          },
        },
      },
    });
  };

  const title = useWatch({ control, name: 'title' }) || 'New Product';
  const description = useWatch({ control, name: 'description' }) || '';

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center gap-3 rounded-2xl border bg-linear-to-r from-primary/10 via-secondary/30 to-muted px-5 py-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href="/admin/products" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <ProductHeader
            title={title}
            description="Create a Shopify-like product onboarding flow with media, variants, and metafields."
          />
        </div>
        <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'} className="px-3 py-1">
          {status}
        </Badge>
        <Button type="submit" disabled={loading || isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          Save Product
        </Button>
      </div>

      <ProductEditorLayout
        main={(
          <>
            <ProductTitleInput register={register} error={errors.title} />
            <ProductDescriptionEditor
              value={description}
              onChange={(value) => setValue('description', value, { shouldDirty: true })}
            />
            <ProductMediaUploader media={mediaItems} onChange={setMediaItems} />
            <ProductVariantsEditor
              optionGroups={optionGroups}
              onOptionGroupsChange={setOptionGroups}
              variants={variantRows}
              onVariantsChange={setVariantRows}
            />
            <ProductMetafields
              fields={selectedCategory.metafields}
              values={metafieldValues}
              onChange={(key, value) => setMetafieldValues((current) => ({ ...current, [key]: value }))}
            />
          </>
        )}
        sidebar={(
          <>
            <ProductStatusCard status={status} onChange={setStatus} />
            <ProductOrganizationCard
              register={register}
              categories={categoryOptions}
              categoryId={selectedCategoryId || ''}
              onCategoryChange={(categoryId) => setValue('categoryId', categoryId, { shouldDirty: true })}
            />
            <ProductSEOCard register={register} />
          </>
        )}
      />
    </form>
  );
}

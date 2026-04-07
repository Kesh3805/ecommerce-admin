'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';

import {
  ADD_PRODUCT_OPTION,
  CREATE_PRODUCT,
  CREATE_VARIANT,
  GET_CATEGORIES,
  GET_LOCATIONS,
  GET_PRODUCTS,
  SET_INVENTORY_LEVEL,
} from '@/graphql/operations';
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
}

interface GetCategoriesResponse {
  categories: BackendCategory[];
}

interface CreateVariantResponse {
  createVariant: {
    inventoryItemId?: number;
  };
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

export default function NewProductPage() {
  const router = useRouter();
  const storeId = Number(process.env.NEXT_PUBLIC_STORE_ID || 1);

  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      description: '',
      brand: '',
      categoryId: '__none__',
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

  const { data: categoriesData, error: categoriesError } = useQuery<GetCategoriesResponse>(GET_CATEGORIES, {
    variables: { storeId },
  });

  const categoryOptions: CategoryOption[] = [
    {
      id: '__none__',
      label: 'No category',
      metafields: [],
    },
    ...(categoriesData?.categories || []).map((category) => ({
      id: String(category.id),
      label: category.name,
      metafields: [],
    })),
  ];

  const selectedCategoryId = useWatch({ control, name: 'categoryId' });
  useEffect(() => {
    if (!selectedCategoryId) {
      setValue('categoryId', categoryOptions[0].id);
    }
  }, [categoryOptions, selectedCategoryId, setValue]);

  const selectedCategory = categoryOptions.find((category) => category.id === selectedCategoryId) || {
    id: '',
    label: 'Uncategorized',
    metafields: [],
  };

  const [createProduct, { loading }] = useMutation<{ createProduct: { id: number } }>(CREATE_PRODUCT, {
    refetchQueries: [
      { query: GET_PRODUCTS, variables: { filter: { store_id: storeId }, pagination: { page: 1, limit: 50 } } },
    ],
  });

  const [addProductOption] = useMutation(ADD_PRODUCT_OPTION);
  const [createVariant] = useMutation<CreateVariantResponse>(CREATE_VARIANT);
  const [setInventoryLevel] = useMutation(SET_INVENTORY_LEVEL);

  const { data: locationsData } = useQuery<{ locations: Array<{ location_id: number; is_active: boolean }> }>(
    GET_LOCATIONS,
    {
      variables: { storeId },
    },
  );

  const onSubmit = async (data: ProductFormData) => {
    const parsedCategoryId = Number(data.categoryId);
    const categoryIds = Number.isInteger(parsedCategoryId) && parsedCategoryId > 0 ? [parsedCategoryId] : undefined;
    const computedHandle = data.seoHandle?.trim() || slugify(data.title);

    try {
      const created = await createProduct({
        variables: {
          input: {
            title: data.title,
            description: data.description || undefined,
            brand: data.brand || undefined,
            status,
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

      const createdProductId = created.data?.createProduct?.id;
      if (!createdProductId) {
        throw new Error('Product creation failed: missing product ID in response.');
      }

      const normalizedOptionGroups = optionGroups
        .map((group) => ({
          name: group.name.trim(),
          values: group.values.map((value) => value.trim()).filter((value) => value.length > 0),
        }))
        .filter((group) => group.name.length > 0 && group.values.length > 0);

      for (const [index, group] of normalizedOptionGroups.entries()) {
        await addProductOption({
          variables: {
            input: {
              product_id: createdProductId,
              name: group.name,
              values: group.values,
              position: index,
            },
          },
        });
      }

      const activeLocation = (locationsData?.locations || []).find((location) => location.is_active);

      const normalizedVariantRows = variantRows.filter(
        (row) => row.sku.trim().length > 0 && Number.isFinite(row.price) && row.price >= 0,
      );

      for (const row of normalizedVariantRows) {
        const optionNamesInOrder = normalizedOptionGroups.map((group) => group.name);
        const optionValuesInOrder = optionNamesInOrder.map((name) => row.options[name]);

        const createdVariant = await createVariant({
          variables: {
            input: {
              product_id: createdProductId,
              option1_value: optionValuesInOrder[0] || undefined,
              option2_value: optionValuesInOrder[1] || undefined,
              option3_value: optionValuesInOrder[2] || undefined,
              sku: row.sku,
              price: row.price,
              inventory_policy: row.inventoryPolicy,
              create_inventory: true,
            },
          },
        });

        const inventoryItemId = createdVariant?.data?.createVariant?.inventoryItemId;
        if (activeLocation && inventoryItemId && Number.isFinite(row.inventory) && row.inventory >= 0) {
          await setInventoryLevel({
            variables: {
              input: {
                inventory_item_id: inventoryItemId,
                location_id: activeLocation.location_id,
                available_quantity: row.inventory,
              },
            },
          });
        }
      }

      router.push('/admin/products');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create product.';

      if (message.toLowerCase().includes('duplicate key value')) {
        setError('root', {
          message:
            'Database sequence conflict on backend (duplicate primary key). Run a sequence reset/migration on API DB, then retry.',
        });
        return;
      }

      setError('root', { message });
    }
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
      {categoriesError && (
        <p className="text-sm text-destructive">
          Could not load categories from backend. You can still create the product without category.
        </p>
      )}
      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
    </form>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';

import {
  ADD_PRODUCT_OPTION,
  ATTACH_PRODUCT_MEDIA,
  CREATE_PRODUCT,
  CREATE_VARIANT,
  DELETE_PRODUCT,
  GET_AVAILABLE_COUNTRIES,
  GET_BRANDS,
  GET_CATEGORIES,
  GET_LOCATIONS,
  GET_MY_STORES,
  GET_PRODUCTS,
  SET_INVENTORY_LEVEL,
} from '@/graphql/operations';
import { COUNTRY_OPTIONS } from '@/lib/countries';
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
  parent_id?: number | null;
  metadata?: unknown;
}

interface GetCategoriesResponse {
  categories: BackendCategory[];
}

interface GetMyStoresResponse {
  myStores: Array<{ store_id: number; name: string }>;
}

interface GetAvailableCountriesResponse {
  availableCountries: string[];
}

interface GetBrandsResponse {
  brands: Array<{ name: string }>;
}

interface CreateVariantResponse {
  createVariant: {
    inventoryItemId?: number;
  };
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

function normalizeMediaUrls(urls: string[]): string[] {
  return [...new Set(urls.map((url) => toAbsoluteMediaUrl(url.trim())).filter((url) => url.length > 0))];
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

const COUNTRY_NAME_BY_CODE = new Map(COUNTRY_OPTIONS.map((country) => [country.code, country.name]));

function normalizeCountryCodes(codes: string[]): string[] {
  return [...new Set(codes.map((code) => code.toUpperCase()).filter((code) => /^[A-Z]{2}$/.test(code)))].sort();
}

function parseCategoryOptionTemplates(metadata: unknown): Array<{ name: string; values: string[] }> {
  if (!metadata) {
    return [];
  }

  const parsed = typeof metadata === 'string' ? (() => {
    try {
      return JSON.parse(metadata) as unknown;
    } catch {
      return null;
    }
  })() : metadata;

  const raw = (parsed as { option_templates?: unknown; optionTemplates?: unknown } | null)?.option_templates
    ?? (parsed as { option_templates?: unknown; optionTemplates?: unknown } | null)?.optionTemplates;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      const name = typeof (entry as { name?: unknown }).name === 'string' ? (entry as { name: string }).name.trim() : '';
      if (!name) {
        return null;
      }
      const rawValues = (entry as { values?: unknown }).values;
      const values = Array.isArray(rawValues)
        ? [...new Set(rawValues.map((value) => String(value ?? '').trim()).filter((value) => value.length > 0))]
        : [];

      return {
        name,
        values,
      };
    })
    .filter((entry): entry is { name: string; values: string[] } => entry !== null);
}

function parseCategoryPathFromMetadata(metadata: unknown): string[] {
  if (!metadata) {
    return [];
  }

  const parsed = typeof metadata === 'string' ? (() => {
    try {
      return JSON.parse(metadata) as unknown;
    } catch {
      return null;
    }
  })() : metadata;

  const rawPath = (parsed as { taxonomy?: { path_tree?: unknown } } | null)?.taxonomy?.path_tree;
  if (typeof rawPath !== 'string') {
    return [];
  }

  return rawPath.split('>').map((segment) => segment.trim()).filter((segment) => segment.length > 0);
}

function buildCategoryHierarchyOptions(categories: BackendCategory[]): CategoryOption[] {
  if (categories.length === 0) {
    return [];
  }

  const byId = new Map<number, BackendCategory>(categories.map((category) => [category.id, category]));
  const childrenByParentId = new Map<number | null, BackendCategory[]>();

  for (const category of categories) {
    const parentId = Number.isInteger(category.parent_id) && byId.has(Number(category.parent_id))
      ? Number(category.parent_id)
      : null;

    const siblings = childrenByParentId.get(parentId) ?? [];
    siblings.push(category);
    childrenByParentId.set(parentId, siblings);
  }

  const sortByName = (left: BackendCategory, right: BackendCategory) => left.name.localeCompare(right.name);
  for (const [parentId, siblings] of childrenByParentId.entries()) {
    childrenByParentId.set(parentId, [...siblings].sort(sortByName));
  }

  const pathCache = new Map<number, string[]>();
  const resolvePath = (category: BackendCategory, trail = new Set<number>()): string[] => {
    const cached = pathCache.get(category.id);
    if (cached) {
      return cached;
    }

    const metadataPath = parseCategoryPathFromMetadata(category.metadata);
    if (metadataPath.length > 0) {
      pathCache.set(category.id, metadataPath);
      return metadataPath;
    }

    if (trail.has(category.id)) {
      return [category.name];
    }

    const nextTrail = new Set(trail);
    nextTrail.add(category.id);

    const parentId = Number.isInteger(category.parent_id) ? Number(category.parent_id) : null;
    if (parentId && byId.has(parentId)) {
      const parent = byId.get(parentId)!;
      const resolved = [...resolvePath(parent, nextTrail), category.name];
      pathCache.set(category.id, resolved);
      return resolved;
    }

    const rootPath = [category.name];
    pathCache.set(category.id, rootPath);
    return rootPath;
  };

  const ordered: BackendCategory[] = [];
  const visited = new Set<number>();

  const walk = (parentId: number | null): void => {
    for (const category of childrenByParentId.get(parentId) ?? []) {
      if (visited.has(category.id)) {
        continue;
      }

      visited.add(category.id);
      ordered.push(category);
      walk(category.id);
    }
  };

  walk(null);
  for (const category of [...categories].sort(sortByName)) {
    if (visited.has(category.id)) {
      continue;
    }

    ordered.push(category);
    walk(category.id);
  }

  return ordered.map((category) => ({
    id: String(category.id),
    label: category.name,
    optionTemplates: parseCategoryOptionTemplates(category.metadata),
    parentId: Number.isInteger(category.parent_id) && byId.has(Number(category.parent_id))
      ? String(category.parent_id)
      : null,
    depth: Math.max(resolvePath(category).length - 1, 0),
  }));
}

export default function NewProductPage() {
  const router = useRouter();

  const { data: myStoresData, loading: myStoresLoading } = useQuery<GetMyStoresResponse>(GET_MY_STORES);
  const storeId = myStoresData?.myStores?.[0]?.store_id;

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
  const [selectedCountryCodes, setSelectedCountryCodes] = useState<string[]>([]);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [mediaSuccessMessage, setMediaSuccessMessage] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const { data: availableCountriesData } = useQuery<GetAvailableCountriesResponse>(GET_AVAILABLE_COUNTRIES, {
    variables: { storeId },
    skip: !storeId,
  });

  const availableCountryCodes = useMemo(() => {
    const fromStore = normalizeCountryCodes(availableCountriesData?.availableCountries ?? []);
    if (fromStore.length > 0) {
      return fromStore;
    }

    return COUNTRY_OPTIONS.map((country) => country.code);
  }, [availableCountriesData]);

  const countryOptions = useMemo(
    () =>
      availableCountryCodes.map((code) => ({
        code,
        name: COUNTRY_NAME_BY_CODE.get(code) || code,
      })),
    [availableCountryCodes],
  );

  useEffect(() => {
    if (availableCountryCodes.length === 0) {
      return;
    }

    setSelectedCountryCodes((current) => {
      if (current.length === 0) {
        return [...availableCountryCodes];
      }

      const filtered = current.filter((code) => availableCountryCodes.includes(code));
      return filtered.length > 0 ? filtered : [...availableCountryCodes];
    });
  }, [availableCountryCodes]);

  const { data: categoriesData, error: categoriesError } = useQuery<GetCategoriesResponse>(GET_CATEGORIES, {
    variables: { storeId },
    skip: !storeId,
  });

  const { data: brandsData } = useQuery<GetBrandsResponse>(GET_BRANDS, {
    variables: {
      storeId,
    },
    skip: !storeId,
    fetchPolicy: 'no-cache',
  });

  const brandSuggestions = useMemo(
    () =>
      [...new Set((brandsData?.brands ?? [])
        .map((item) => String(item.name ?? '').trim())
        .filter((brand) => brand.length > 0))]
        .sort((a, b) => a.localeCompare(b)),
    [brandsData],
  );

  const categoryOptions: CategoryOption[] = useMemo(
    () => [
      {
        id: '__none__',
        label: 'No category',
        optionTemplates: [],
      },
      ...buildCategoryHierarchyOptions(categoriesData?.categories || []),
    ],
    [categoriesData?.categories],
  );

  const selectedCategoryId = useWatch({ control, name: 'categoryId' });
  const selectedBrand = useWatch({ control, name: 'brand' }) || '';
  useEffect(() => {
    if (!selectedCategoryId) {
      setValue('categoryId', categoryOptions[0].id);
    }
  }, [categoryOptions, selectedCategoryId, setValue]);

  const selectedCategory = categoryOptions.find((category) => category.id === selectedCategoryId) || {
    id: '',
    label: 'Uncategorized',
    optionTemplates: [],
  };

  const [createProduct, { loading }] = useMutation<{ createProduct: { id: number } }>(CREATE_PRODUCT, {
    refetchQueries: [
      { query: GET_PRODUCTS, variables: { pagination: { page: 1, limit: 50 } } },
    ],
  });

  const [addProductOption] = useMutation(ADD_PRODUCT_OPTION);
  const [createVariant] = useMutation<CreateVariantResponse>(CREATE_VARIANT);
  const [attachProductMedia] = useMutation(ATTACH_PRODUCT_MEDIA);
  const [deleteProductRollback] = useMutation(DELETE_PRODUCT);
  const [setInventoryLevel] = useMutation(SET_INVENTORY_LEVEL);

  const { data: locationsData } = useQuery<{ locations: Array<{ location_id: number; is_active: boolean }> }>(
    GET_LOCATIONS,
    {
      variables: { storeId },
      skip: !storeId,
    },
  );

  const onSubmit = async (data: ProductFormData) => {
    if (!storeId) {
      setError('root', { message: 'No accessible store found for your account.' });
      return;
    }

    if (uploadingFiles) {
      setError('root', { message: 'Please wait for media uploads to finish before saving.' });
      return;
    }

    const parsedCategoryId = Number(data.categoryId);
    const categoryId = Number.isInteger(parsedCategoryId) && parsedCategoryId > 0 ? parsedCategoryId : undefined;
    const computedHandle = data.seoHandle?.trim() || slugify(data.title);
    if (selectedCountryCodes.length === 0) {
      setError('root', { message: 'Select at least one country for product availability.' });
      return;
    }

    const normalizedOptionGroups = optionGroups
      .map((group) => ({
        name: group.name.trim(),
        values: group.values.map((value) => value.trim()).filter((value) => value.length > 0),
      }))
      .filter((group) => group.name.length > 0 && group.values.length > 0);

    if (normalizedOptionGroups.length > 0 && variantRows.length === 0) {
      setError('root', { message: 'Generate variants before saving this product.' });
      return;
    }

    const normalizedVariantRows = variantRows.filter(
      (row) => row.sku.trim().length > 0 && Number.isFinite(row.price) && row.price >= 0,
    );

    if (variantRows.length > 0 && normalizedVariantRows.length !== variantRows.length) {
      setError('root', {
        message: 'Every variant must have a valid SKU and non-negative price before saving.',
      });
      return;
    }

    const productMediaUrls = normalizeMediaUrls(mediaItems.map((item) => item.url));
    const hasUnsavedBlobMedia = productMediaUrls.some((url) => url.startsWith('blob:'));

    if (hasUnsavedBlobMedia) {
      setError('root', {
        message: 'One or more media files are not uploaded yet. Please re-upload and try again.',
      });
      return;
    }

    let createdProductId: number | null = null;

    try {
      const created = await createProduct({
        variables: {
          input: {
            title: data.title,
            description: data.description || undefined,
            brand: data.brand || undefined,
            status,
            store_id: storeId,
            category_id: categoryId,
            seo: {
              handle: computedHandle,
              meta_title: data.seoTitle || undefined,
              meta_description: data.seoDescription || undefined,
            },
            primary_image_url: productMediaUrls[0],
            media_urls: productMediaUrls.length > 0 ? productMediaUrls : undefined,
            country_codes: selectedCountryCodes,
          },
        },
      });

      const resolvedProductId = created.data?.createProduct?.id;
      if (!resolvedProductId) {
        throw new Error('Product creation failed: missing product ID in response.');
      }
      createdProductId = resolvedProductId;

      for (const [index, mediaUrl] of productMediaUrls.entries()) {
        await attachProductMedia({
          variables: {
            input: {
              product_id: resolvedProductId,
              url: mediaUrl,
              type: 'IMAGE',
              position: index + 1,
              is_cover: index === 0,
            },
          },
        });
      }

      for (const [index, group] of normalizedOptionGroups.entries()) {
        await addProductOption({
          variables: {
            input: {
              product_id: resolvedProductId,
              name: group.name,
              values: group.values,
              position: index,
            },
          },
        });
      }

      const activeLocation = (locationsData?.locations || []).find((location) => location.is_active);

      for (const row of normalizedVariantRows) {
        const optionNamesInOrder = normalizedOptionGroups.map((group) => group.name);
        const optionValuesInOrder = optionNamesInOrder.map((name) => row.options[name]);

        const createdVariant = await createVariant({
          variables: {
            input: {
              product_id: resolvedProductId,
              option1_value: optionValuesInOrder[0] || undefined,
              option2_value: optionValuesInOrder[1] || undefined,
              option3_value: optionValuesInOrder[2] || undefined,
              sku: row.sku,
              price: row.price,
              inventory_policy: row.inventoryPolicy,
              media_urls: Array.isArray(row.mediaUrls) && row.mediaUrls.length > 0 ? row.mediaUrls : undefined,
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

      router.push(`/admin/products/${resolvedProductId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create product.';

      if (createdProductId) {
        try {
          await deleteProductRollback({ variables: { id: createdProductId } });
        } catch {
          setError('root', {
            message: `${message} Product ${createdProductId} may have been partially created. Please delete it manually if needed.`,
          });
          return;
        }
      }

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

  const handleUploadFiles = async (files: File[]) => {
    if (!files.length) {
      return;
    }

    setMediaUploadError(null);
    setMediaSuccessMessage(null);
    setUploadingFiles(true);

    try {
      const graphQlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4100/graphql';
      const apiBaseUrl = new URL(graphQlUrl).origin;
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null;
      const uploadedItems: ProductMediaItem[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(`${apiBaseUrl}/api/media/upload`, {
          method: 'POST',
          body: formData,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(errorText || `Failed to upload ${file.name}`);
        }

        const uploadResult = (await uploadResponse.json()) as { url?: string };
        if (!uploadResult.url) {
          throw new Error(`Upload endpoint did not return a URL for ${file.name}`);
        }

        uploadedItems.push({
          id: crypto.randomUUID(),
          url: toAbsoluteMediaUrl(uploadResult.url),
          name: file.name,
          size: file.size,
        });
      }

      setMediaItems((current) => [...current, ...uploadedItems]);
      setMediaSuccessMessage(`Uploaded ${files.length} file${files.length === 1 ? '' : 's'} successfully.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File upload failed.';
      setMediaUploadError(message);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSaveProduct = handleSubmit(onSubmit);

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
            description="Create a Shopify-like product onboarding flow with media and variants."
          />
        </div>
        <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'} className="px-3 py-1">
          {status}
        </Badge>
        <Button type="button" onClick={() => void handleSaveProduct()} disabled={loading || isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          Save Product
        </Button>
      </div>

      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      {!myStoresLoading && !storeId && (
        <p className="text-sm text-destructive">No accessible store found for your account.</p>
      )}

      <ProductEditorLayout
        main={(
          <>
            <ProductTitleInput register={register} error={errors.title} />
            <ProductDescriptionEditor
              value={description}
              onChange={(value) => setValue('description', value, { shouldDirty: true })}
            />
            <ProductMediaUploader media={mediaItems} onChange={setMediaItems} onUploadFiles={handleUploadFiles} />
            {uploadingFiles && <p className="text-sm text-muted-foreground">Uploading files...</p>}
            {mediaSuccessMessage && <p className="text-sm text-green-600">{mediaSuccessMessage}</p>}
            {mediaUploadError && <p className="text-sm text-destructive">{mediaUploadError}</p>}
            <ProductVariantsEditor
              optionGroups={optionGroups}
              onOptionGroupsChange={setOptionGroups}
              variants={variantRows}
              onVariantsChange={setVariantRows}
              suggestedOptionGroups={selectedCategory.optionTemplates}
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
              brandValue={selectedBrand}
              brandSuggestions={brandSuggestions}
              onBrandChange={(brand) => setValue('brand', brand, { shouldDirty: true })}
            />
            <ProductSEOCard register={register} />
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold">Country Availability</h3>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Product will be visible only in selected storefront countries.
                </p>
                <Link href="/admin/locations/countries" className="text-xs font-medium text-primary hover:underline">
                  Manage countries
                </Link>
              </div>
              <div className="mt-3 grid max-h-56 grid-cols-1 gap-2 overflow-auto text-sm">
                {countryOptions.map((country) => {
                  const checked = selectedCountryCodes.includes(country.code);

                  return (
                    <label key={country.code} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedCountryCodes((current) => {
                            if (current.includes(country.code)) {
                              return current.filter((item) => item !== country.code);
                            }

                            return [...current, country.code].sort();
                          });
                        }}
                        className="h-4 w-4"
                      />
                      <span>{country.code}</span>
                      <span className="text-muted-foreground">{country.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
      />
      {categoriesError && (
        <p className="text-sm text-destructive">
          Could not load categories from backend. You can still create the product without category.
        </p>
      )}
    </form>
  );
}

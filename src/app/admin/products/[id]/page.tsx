'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Trash2, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

import {
  GET_PRODUCT,
  GET_VARIANTS,
  GET_PRODUCT_MEDIA,
  GET_AVAILABLE_COUNTRIES,
  UPDATE_PRODUCT,
  DELETE_PRODUCT,
  ADD_PRODUCT_OPTION,
  GENERATE_VARIANTS,
  UPDATE_VARIANT,
  DELETE_VARIANT,
  ATTACH_PRODUCT_MEDIA,
  DELETE_PRODUCT_MEDIA,
  SET_INVENTORY_LEVEL,
  GET_LOCATIONS,
  PUBLISH_PRODUCT,
  ARCHIVE_PRODUCT,
  GET_PRODUCTS,
} from '@/graphql/operations';
import { COUNTRY_OPTIONS } from '@/lib/countries';
import { ProductMediaItem, ProductMediaUploader } from '@/components/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  brand: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoHandle: z.string().optional(),
});

const COUNTRY_NAME_BY_CODE = new Map(COUNTRY_OPTIONS.map((country) => [country.code, country.name]));

function normalizeCountryCodes(codes: string[]): string[] {
  return [...new Set(codes.map((code) => code.toUpperCase()).filter((code) => /^[A-Z]{2}$/.test(code)))].sort();
}

type ProductFormData = z.infer<typeof productSchema>;

interface OptionValue {
  id: string;
  value: string;
  position: number;
}

interface ProductOption {
  id: string;
  name: string;
  position: number;
  values: OptionValue[];
}

interface Variant {
  id: number;
  title: string;
  option1_value?: string;
  option2_value?: string;
  option3_value?: string;
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  weight?: number;
  inventoryPolicy: string;
  inventoryItemId?: number;
  inventory_item?: {
    id: number;
    total_available?: number;
  };
  optionValues?: { id: string; value: string; option: { id: string; name: string } }[];
  createdAt: string;
}

interface Location {
  location_id: number;
  name: string;
  is_active: boolean;
}

interface EditableVariantState {
  sku: string;
  price: string;
  compareAtPrice: string;
  inventoryPolicy: 'DENY' | 'CONTINUE';
  inventory: string;
  saving: boolean;
  error?: string;
}

interface Product {
  id: number;
  storeId: number;
  title: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  brand?: string;
  seo?: {
    meta_title?: string;
    meta_description?: string;
    handle?: string;
  };
  publishedAt?: string;
  country_codes?: string[];
  options: ProductOption[];
  variants?: Variant[];
  categories?: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

interface GetAvailableCountriesResponse {
  availableCountries: string[];
}

interface ProductMediaRecord {
  id: number;
  url: string;
  altText?: string;
  position: number;
  isCover: boolean;
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

function OptionEditor({
  productId,
  options,
  onOptionAdded,
}: {
  productId: number;
  options: ProductOption[];
  onOptionAdded: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [optionName, setOptionName] = useState('');
  const [optionValues, setOptionValues] = useState('');

  const [addOption, { loading }] = useMutation(ADD_PRODUCT_OPTION, {
    onCompleted: () => {
      setIsOpen(false);
      setOptionName('');
      setOptionValues('');
      onOptionAdded();
    },
  });

  const handleAddOption = async () => {
    if (!optionName.trim() || !optionValues.trim()) return;

    const values = optionValues
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    await addOption({
      variables: {
        input: {
          product_id: productId,
          name: optionName.trim(),
          values,
          position: options.length,
        },
      },
    });
  };

  const canAddMore = options.length < 3;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Options</CardTitle>
            <CardDescription>
              Define product options like Size, Color, Material (max 3)
            </CardDescription>
          </div>
          {canAddMore && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Product Option</DialogTitle>
                  <DialogDescription>
                    Create a new option like Size, Color, or Material
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="optionName">Option Name</Label>
                    <Input
                      id="optionName"
                      placeholder="e.g., Size, Color, Material"
                      value={optionName}
                      onChange={(e) => setOptionName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="optionValues">Values (comma-separated)</Label>
                    <Input
                      id="optionValues"
                      placeholder="e.g., S, M, L, XL"
                      value={optionValues}
                      onChange={(e) => setOptionValues(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddOption} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Option
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No options defined yet. Add options to generate variants.
          </p>
        ) : (
          <div className="space-y-4">
            {options.map((option) => (
              <div key={option.id} className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="font-medium">{option.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {option.values.map((val) => (
                      <Badge key={val.id} variant="outline">
                        {val.value}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VariantsTable({
  productId,
  storeId,
  variants,
  options,
  onVariantsGenerated,
}: {
  productId: number;
  storeId: number;
  variants: Variant[];
  options: ProductOption[];
  onVariantsGenerated: () => Promise<void> | void;
}) {
  const [generateVariants, { loading }] = useMutation(GENERATE_VARIANTS, {
    onCompleted: () => {
      onVariantsGenerated();
    },
  });

  const [updateVariant] = useMutation(UPDATE_VARIANT);
  const [deleteVariantMutation] = useMutation(DELETE_VARIANT);
  const [setInventoryLevel] = useMutation(SET_INVENTORY_LEVEL);

  const { data: locationsData } = useQuery<{ locations: Location[] }>(GET_LOCATIONS, {
    variables: { storeId },
    skip: !Number.isInteger(storeId),
  });

  const activeLocationId = useMemo(() => {
    const locations = locationsData?.locations || [];
    const active = locations.find((location) => location.is_active);
    return active?.location_id ?? locations[0]?.location_id;
  }, [locationsData]);

  const toEditableVariantState = (variant: Variant): EditableVariantState => ({
    sku: variant.sku || '',
    price: Number.isFinite(variant.price) ? String(variant.price) : '',
    compareAtPrice: Number.isFinite(variant.compareAtPrice) ? String(variant.compareAtPrice) : '',
    inventoryPolicy: variant.inventoryPolicy === 'CONTINUE' ? 'CONTINUE' : 'DENY',
    inventory: Number.isFinite(variant.inventory_item?.total_available)
      ? String(variant.inventory_item?.total_available)
      : '0',
    saving: false,
  });

  const variantById = useMemo(() => {
    return new Map(variants.map((variant) => [variant.id, variant] as const));
  }, [variants]);

  const [editableVariantDrafts, setEditableVariantDrafts] = useState<Record<number, EditableVariantState>>({});

  const editableVariants = useMemo(() => {
    const nextState: Record<number, EditableVariantState> = {};

    for (const variant of variants) {
      nextState[variant.id] = editableVariantDrafts[variant.id] ?? toEditableVariantState(variant);
    }

    return nextState;
  }, [editableVariantDrafts, variants]);

  const updateEditableVariant = (
    variantId: number,
    updater: (current: EditableVariantState) => EditableVariantState,
  ) => {
    setEditableVariantDrafts((current) => {
      const variant = variantById.get(variantId);
      if (!variant) {
        return current;
      }

      const existing = current[variantId] ?? toEditableVariantState(variant);

      return {
        ...current,
        [variantId]: updater(existing),
      };
    });
  };

  const handleSaveVariant = async (variant: Variant) => {
    const draft = editableVariants[variant.id];
    if (!draft) {
      return;
    }

    const parsedPrice = draft.price.trim().length > 0 ? Number(draft.price) : undefined;
    const parsedCompareAt = draft.compareAtPrice.trim().length > 0 ? Number(draft.compareAtPrice) : undefined;
    const parsedInventory = Number(draft.inventory);
    const currentInventory = Number(variant.inventory_item?.total_available ?? 0);
    const inventoryChanged = parsedInventory !== currentInventory;

    if (parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      updateEditableVariant(variant.id, (current) => ({ ...current, error: 'Price must be a valid non-negative number.' }));
      return;
    }

    if (parsedCompareAt !== undefined && (!Number.isFinite(parsedCompareAt) || parsedCompareAt < 0)) {
      updateEditableVariant(variant.id, (current) => ({ ...current, error: 'Compare-at must be a valid non-negative number.' }));
      return;
    }

    if (!Number.isFinite(parsedInventory) || parsedInventory < 0) {
      updateEditableVariant(variant.id, (current) => ({ ...current, error: 'Inventory must be a valid non-negative number.' }));
      return;
    }

    if (inventoryChanged && !activeLocationId) {
      updateEditableVariant(variant.id, (current) => ({
        ...current,
        error: 'No active inventory location found for this store.',
      }));
      return;
    }

    updateEditableVariant(variant.id, (current) => ({ ...current, saving: true, error: undefined }));

    try {
      await updateVariant({
        variables: {
          input: {
            variant_id: variant.id,
            sku: draft.sku || undefined,
            price: parsedPrice,
            compare_at_price: parsedCompareAt,
            inventory_policy: draft.inventoryPolicy,
          },
        },
      });

      if (inventoryChanged && variant.inventoryItemId && activeLocationId) {
        await setInventoryLevel({
          variables: {
            input: {
              inventory_item_id: variant.inventoryItemId,
              location_id: activeLocationId,
              available_quantity: parsedInventory,
            },
          },
        });
      }

      updateEditableVariant(variant.id, (current) => ({ ...current, saving: false, error: undefined }));
      await onVariantsGenerated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save variant changes.';
      updateEditableVariant(variant.id, (current) => ({ ...current, saving: false, error: message }));
    }
  };

  const handleGenerateVariants = async () => {
    await generateVariants({
      variables: {
        input: {
          product_id: productId,
          default_price: 0,
          sku_prefix: 'SKU',
          create_inventory: true,
        },
      },
    });
  };

  const handleDeleteVariant = async (variant: Variant) => {
    if (!confirm(`Delete variant '${variant.title}'?`)) {
      return;
    }

    updateEditableVariant(variant.id, (current) => ({ ...current, saving: true, error: undefined }));

    try {
      await deleteVariantMutation({
        variables: {
          id: variant.id,
        },
      });

      setEditableVariantDrafts((current) => {
        const next = { ...current };
        delete next[variant.id];
        return next;
      });

      await onVariantsGenerated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete variant.';
      updateEditableVariant(variant.id, (current) => ({ ...current, saving: false, error: message }));
    }
  };

  const canGenerate = options.length > 0 && variants.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Variants</CardTitle>
            <CardDescription>
              {variants.length} variant{variants.length !== 1 ? 's' : ''} generated
            </CardDescription>
          </div>
          {canGenerate && (
            <Button onClick={handleGenerateVariants} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Variants
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {variants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {options.length === 0
              ? 'Add product options first, then generate variants.'
              : 'Click "Generate Variants" to create variants from your options.'}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Compare At</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead className="w-32">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant) => (
                  <TableRow key={variant.id}>
                  <TableCell className="font-medium">{variant.title}</TableCell>
                  <TableCell>
                    <Input
                      value={editableVariants[variant.id]?.sku ?? ''}
                      onChange={(event) =>
                        updateEditableVariant(variant.id, (current) => ({
                          ...current,
                          sku: event.target.value,
                          error: undefined,
                        }))
                      }
                      className="w-40"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={editableVariants[variant.id]?.price ?? ''}
                      onChange={(event) =>
                        updateEditableVariant(variant.id, (current) => ({
                          ...current,
                          price: event.target.value,
                          error: undefined,
                        }))
                      }
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={editableVariants[variant.id]?.compareAtPrice ?? ''}
                      onChange={(event) =>
                        updateEditableVariant(variant.id, (current) => ({
                          ...current,
                          compareAtPrice: event.target.value,
                          error: undefined,
                        }))
                      }
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={editableVariants[variant.id]?.inventoryPolicy ?? 'DENY'}
                      onValueChange={(value) =>
                        updateEditableVariant(variant.id, (current) => ({
                          ...current,
                          inventoryPolicy: value === 'CONTINUE' ? 'CONTINUE' : 'DENY',
                          error: undefined,
                        }))
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DENY">Deny</SelectItem>
                        <SelectItem value="CONTINUE">Continue</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={editableVariants[variant.id]?.inventory ?? '0'}
                      onChange={(event) =>
                        updateEditableVariant(variant.id, (current) => ({
                          ...current,
                          inventory: event.target.value,
                          error: undefined,
                        }))
                      }
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveVariant(variant)}
                        disabled={editableVariants[variant.id]?.saving}
                      >
                        {editableVariants[variant.id]?.saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Save'
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteVariant(variant)}
                        disabled={editableVariants[variant.id]?.saving}
                        aria-label={`Delete variant ${variant.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {variants.map((variant) => {
              const errorMessage = editableVariants[variant.id]?.error;
              if (!errorMessage) {
                return null;
              }

              return (
                <p key={`error-${variant.id}`} className="mt-2 text-sm text-destructive">
                  {variant.title}: {errorMessage}
                </p>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('details');

  const { data, loading, error, refetch } = useQuery<{ product: Product }>(GET_PRODUCT, {
    variables: { id: Number(id) },
  });

  const {
    data: variantsData,
    loading: variantsLoading,
    refetch: refetchVariants,
  } = useQuery<{ variants: Variant[] }>(GET_VARIANTS, {
    variables: { productId: Number(id) },
    skip: !Number.isInteger(Number(id)),
  });

  const {
    data: mediaData,
    loading: mediaLoading,
    refetch: refetchMedia,
  } = useQuery<{ productMedia: ProductMediaRecord[] }>(GET_PRODUCT_MEDIA, {
    variables: { productId: Number(id) },
    skip: !Number.isInteger(Number(id)),
  });

  const product = data?.product;
  const productVariants = variantsData?.variants || product?.variants || [];
  const [mediaItems, setMediaItems] = useState<ProductMediaItem[]>([]);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [mediaSuccessMessage, setMediaSuccessMessage] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [hasUnsavedMediaChanges, setHasUnsavedMediaChanges] = useState(false);
  const [hasUnsavedCountryChanges, setHasUnsavedCountryChanges] = useState(false);
  const [selectedCountryCodes, setSelectedCountryCodes] = useState<string[]>([]);

  const { data: availableCountriesData } = useQuery<GetAvailableCountriesResponse>(GET_AVAILABLE_COUNTRIES, {
    variables: { storeId: product?.storeId },
    skip: !product?.storeId,
  });

  const configuredCountryCodes = useMemo(() => {
    const normalized = normalizeCountryCodes(availableCountriesData?.availableCountries ?? []);
    if (normalized.length > 0) {
      return normalized;
    }

    return COUNTRY_OPTIONS.map((country) => country.code);
  }, [availableCountriesData]);

  const countryOptions = useMemo(() => {
    const optionCodes = [...new Set([...configuredCountryCodes, ...selectedCountryCodes])].sort();

    return optionCodes.map((code) => ({
      code,
      name: COUNTRY_NAME_BY_CODE.get(code) || code,
    }));
  }, [configuredCountryCodes, selectedCountryCodes]);

  useEffect(() => {
    const mapped: ProductMediaItem[] = (mediaData?.productMedia || []).map((item) => {
      const absoluteUrl = toAbsoluteMediaUrl(item.url);
      const fileName = absoluteUrl.split('/').pop() || `media-${item.id}`;

      return {
        id: String(item.id),
        url: absoluteUrl,
        name: fileName,
        size: 0,
      };
    });

    setMediaItems(mapped);
  }, [mediaData]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      description: '',
      brand: '',
      seoTitle: '',
      seoDescription: '',
      seoHandle: '',
    },
  });

  useEffect(() => {
    if (!product) {
      return;
    }

    reset({
      title: product.title,
      description: product.description || '',
      brand: product.brand || '',
      seoTitle: product.seo?.meta_title || '',
      seoDescription: product.seo?.meta_description || '',
      seoHandle: product.seo?.handle || '',
    });
  }, [product, reset]);

  useEffect(() => {
    if (!product) {
      return;
    }

    const fromProduct = normalizeCountryCodes(product.country_codes ?? []);
    const fallback = configuredCountryCodes.length > 0
      ? configuredCountryCodes
      : COUNTRY_OPTIONS.map((country) => country.code);
    const next = fromProduct.length > 0 ? fromProduct : fallback;
    setSelectedCountryCodes([...new Set(next)].sort());
    setHasUnsavedCountryChanges(false);
  }, [configuredCountryCodes, product]);

  const [updateProduct, { loading: updating }] = useMutation(UPDATE_PRODUCT);
  const [deleteProduct, { loading: deleting }] = useMutation(DELETE_PRODUCT, {
    refetchQueries: [{ query: GET_PRODUCTS, variables: { pagination: { page: 1, limit: 50 } } }],
    onCompleted: () => {
      router.push('/admin/products');
    },
  });
  const [publishProduct, { loading: publishing }] = useMutation(PUBLISH_PRODUCT);
  const [archiveProduct, { loading: archiving }] = useMutation(ARCHIVE_PRODUCT);
  const [attachProductMedia, { loading: attachingMedia }] = useMutation(ATTACH_PRODUCT_MEDIA);
  const [deleteProductMedia, { loading: deletingMedia }] = useMutation(DELETE_PRODUCT_MEDIA);
  const [saveError, setSaveError] = useState<string | null>(null);

  const onSubmit = async (formData: ProductFormData) => {
    setSaveError(null);

    const seoHandle = formData.seoHandle?.trim() || product?.seo?.handle || undefined;
    const seoTitle = formData.seoTitle?.trim() || undefined;
    const seoDescription = formData.seoDescription?.trim() || undefined;

    try {
      if (selectedCountryCodes.length === 0) {
        setSaveError('Select at least one country for product availability.');
        return;
      }

      await updateProduct({
        variables: {
          input: {
            product_id: Number(id),
            title: formData.title,
            description: formData.description || undefined,
            brand: formData.brand || undefined,
            country_codes: selectedCountryCodes,
            ...(seoHandle
              ? {
                  seo: {
                    handle: seoHandle,
                    meta_title: seoTitle,
                    meta_description: seoDescription,
                  },
                }
              : {}),
          },
        },
      });

      await refetch();
      setHasUnsavedMediaChanges(false);
      setHasUnsavedCountryChanges(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save product.';
      setSaveError(message);
    }
  };

  const handlePublish = async () => {
    try {
      await publishProduct({ variables: { id: Number(id) } });
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish product.';
      setSaveError(message);
    }
  };

  const handleArchive = async () => {
    try {
      await archiveProduct({ variables: { id: Number(id) } });
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to archive product.';
      setSaveError(message);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct({ variables: { id: Number(id) } });
        router.push('/admin/products');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete product.';
        setSaveError(message);
      }
    }
  };

  const handleAttachMediaByUrl = async () => {
    const url = mediaUrlInput.trim();
    if (!url) {
      return;
    }

    setMediaUploadError(null);
    setMediaSuccessMessage(null);

    try {
      await attachProductMedia({
        variables: {
          input: {
            product_id: Number(id),
            url: toAbsoluteMediaUrl(url),
            type: 'IMAGE',
            position: (mediaData?.productMedia?.length || 0) + 1,
            is_cover: (mediaData?.productMedia?.length || 0) === 0,
          },
        },
      });

      setMediaUrlInput('');
      await refetchMedia();
      setMediaSuccessMessage('Media attached successfully.');
      setHasUnsavedMediaChanges(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to attach media.';
      setMediaUploadError(message);
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

      let currentPosition = (mediaData?.productMedia?.length || 0) + 1;

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

        await attachProductMedia({
          variables: {
            input: {
              product_id: Number(id),
              url: toAbsoluteMediaUrl(uploadResult.url),
              type: 'IMAGE',
              position: currentPosition,
              is_cover: currentPosition === 1,
            },
          },
        });

        currentPosition += 1;
      }

      await refetchMedia();
      setMediaSuccessMessage(`Uploaded ${files.length} file${files.length === 1 ? '' : 's'} successfully.`);
      setHasUnsavedMediaChanges(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File upload failed.';
      setMediaUploadError(message);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    const parsedMediaId = Number(mediaId);
    if (!Number.isFinite(parsedMediaId)) {
      setMediaUploadError('Cannot remove unsaved media item.');
      return;
    }

    setMediaUploadError(null);
    setMediaSuccessMessage(null);

    try {
      await deleteProductMedia({
        variables: {
          mediaId: parsedMediaId,
        },
      });

      await refetchMedia();
      setMediaSuccessMessage('Media removed successfully.');
      setHasUnsavedMediaChanges(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove media.';
      setMediaUploadError(message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/admin/products" />}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Product Not Found</h1>
            <p className="text-muted-foreground">
              The product you&apos;re looking for doesn&apos;t exist or was deleted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href="/admin/products" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{product.title}</h1>
          <p className="text-muted-foreground">
            Created {new Date(product.createdAt).toLocaleDateString()}
          </p>
        </div>
        <ProductStatusBadge status={product.status} />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/admin/products/${product.id}/preview`} />}
          >
            Preview
          </Button>
          {product.status === 'DRAFT' && (
            <Button
              variant="outline"
              onClick={handlePublish}
              disabled={publishing || variantsLoading || productVariants.length === 0}
            >
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish
            </Button>
          )}
          {product.status === 'ACTIVE' && (
            <Button variant="outline" onClick={handleArchive} disabled={archiving}>
              {archiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archive
            </Button>
          )}
          <Button onClick={handleSubmit(onSubmit)} disabled={updating || (!isDirty && !hasUnsavedMediaChanges && !hasUnsavedCountryChanges)}>
            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>
      {saveError && <p className="text-sm text-destructive">{saveError}</p>}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" {...register('title')} />
                    {errors.title && (
                      <p className="text-sm text-destructive">{errors.title.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" rows={6} {...register('description')} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input id="brand" {...register('brand')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <p className="text-sm">{product.categories?.[0]?.name || 'No category'}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Country Availability</Label>
                      <Link href="/admin/locations/countries" className="text-xs font-medium text-primary hover:underline">
                        Manage countries
                      </Link>
                    </div>
                    <div className="grid max-h-52 grid-cols-1 gap-2 overflow-auto rounded-md border p-2">
                      {countryOptions.map((country) => {
                        const checked = selectedCountryCodes.includes(country.code);

                        return (
                          <label key={country.code} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setHasUnsavedCountryChanges(true);
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full"
                  >
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Product
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="variants" className="space-y-6 pt-4">
          <OptionEditor
            productId={product.id}
            options={product.options}
            onOptionAdded={() => refetch()}
          />
          <VariantsTable
            productId={product.id}
            storeId={product.storeId}
            variants={productVariants}
            options={product.options}
            onVariantsGenerated={async () => {
              await refetchVariants();
            }}
          />
        </TabsContent>

        <TabsContent value="media" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Media</CardTitle>
              <CardDescription>
                Drag/drop or attach URLs to save media immediately (no main Save click needed)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProductMediaUploader
                media={mediaItems}
                onChange={setMediaItems}
                onUploadFiles={handleUploadFiles}
                onRemoveMedia={handleRemoveMedia}
              />
              <div className="space-y-2">
                <Label htmlFor="media-url">Attach by image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="media-url"
                    placeholder="https://example.com/product-image.jpg"
                    value={mediaUrlInput}
                    onChange={(event) => setMediaUrlInput(event.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={handleAttachMediaByUrl}
                    disabled={attachingMedia || deletingMedia || uploadingFiles || mediaUrlInput.trim().length === 0}
                  >
                    {attachingMedia && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Attach URL
                  </Button>
                </div>
              </div>
              {uploadingFiles && <p className="text-sm text-muted-foreground">Uploading files...</p>}
              {mediaLoading && <p className="text-sm text-muted-foreground">Loading media...</p>}
              {mediaSuccessMessage && <p className="text-sm text-green-600">{mediaSuccessMessage}</p>}
              {mediaUploadError && <p className="text-sm text-destructive">{mediaUploadError}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Engine Optimization</CardTitle>
              <CardDescription>
                Customize how this product appears in search results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">Page Title</Label>
                <Input id="seoTitle" {...register('seoTitle')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDescription">Meta Description</Label>
                <Textarea id="seoDescription" rows={3} {...register('seoDescription')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoHandle">URL Handle</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/products/</span>
                  <Input id="seoHandle" {...register('seoHandle')} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

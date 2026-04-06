'use client';

import { use, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Trash2, Plus, X, Loader2 } from 'lucide-react';
import Link from 'next/link';

import {
  GET_PRODUCT,
  UPDATE_PRODUCT,
  DELETE_PRODUCT,
  ADD_PRODUCT_OPTION,
  GENERATE_VARIANTS,
  PUBLISH_PRODUCT,
  ARCHIVE_PRODUCT,
  GET_PRODUCTS,
} from '@/graphql/operations';
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
import { Separator } from '@/components/ui/separator';

const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  brand: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoHandle: z.string().optional(),
});

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
  id: string;
  title: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  weight?: number;
  inventoryPolicy: string;
  optionValues?: { id: string; value: string; option: { id: string; name: string } }[];
  createdAt: string;
}

interface Product {
  id: number;
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
  options: ProductOption[];
  variants: Variant[];
  media: { id: string; url: string; altText?: string; position: number; isCover: boolean }[];
  category?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
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
  variants,
  options,
  onVariantsGenerated,
}: {
  productId: number;
  variants: Variant[];
  options: ProductOption[];
  onVariantsGenerated: () => void;
}) {
  const [generateVariants, { loading }] = useMutation(GENERATE_VARIANTS, {
    onCompleted: () => {
      onVariantsGenerated();
    },
  });

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Compare At</TableHead>
                <TableHead>Inventory</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-medium">{variant.title}</TableCell>
                  <TableCell>{variant.sku}</TableCell>
                  <TableCell>₹{variant.price}</TableCell>
                  <TableCell>
                    {variant.compareAtPrice ? `₹${variant.compareAtPrice}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Track</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

  const product = data?.product;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    values: product
      ? {
          title: product.title,
          description: product.description || '',
          brand: product.brand || '',
          seoTitle: product.seo?.meta_title || '',
          seoDescription: product.seo?.meta_description || '',
          seoHandle: product.seo?.handle || '',
        }
      : undefined,
  });

  const [updateProduct, { loading: updating }] = useMutation(UPDATE_PRODUCT);
  const [deleteProduct, { loading: deleting }] = useMutation(DELETE_PRODUCT, {
    refetchQueries: [{ query: GET_PRODUCTS, variables: { pagination: { page: 1, limit: 50 } } }],
    onCompleted: () => {
      router.push('/admin/products');
    },
  });
  const [publishProduct, { loading: publishing }] = useMutation(PUBLISH_PRODUCT);
  const [archiveProduct, { loading: archiving }] = useMutation(ARCHIVE_PRODUCT);

  const onSubmit = async (formData: ProductFormData) => {
    await updateProduct({
      variables: {
        input: {
          product_id: Number(id),
          title: formData.title,
          description: formData.description || undefined,
          brand: formData.brand || undefined,
          seo: {
            handle: formData.seoHandle || undefined,
            meta_title: formData.seoTitle || undefined,
            meta_description: formData.seoDescription || undefined,
          },
        },
      },
    });
    refetch();
  };

  const handlePublish = async () => {
    await publishProduct({ variables: { id: Number(id) } });
    refetch();
  };

  const handleArchive = async () => {
    await archiveProduct({ variables: { id: Number(id) } });
    refetch();
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct({ variables: { id: Number(id) } });
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
              The product you're looking for doesn't exist or was deleted.
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
          {product.status === 'DRAFT' && (
            <Button
              variant="outline"
              onClick={handlePublish}
              disabled={publishing || product.variants.length === 0}
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
          <Button onClick={handleSubmit(onSubmit)} disabled={updating || !isDirty}>
            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

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
                    <p className="text-sm">{product.category?.name || 'No category'}</p>
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
            variants={product.variants}
            options={product.options}
            onVariantsGenerated={() => refetch()}
          />
        </TabsContent>

        <TabsContent value="media" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Media</CardTitle>
              <CardDescription>
                Upload images for your product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {product.media.map((m) => (
                  <div
                    key={m.id}
                    className="aspect-square rounded-lg border overflow-hidden relative"
                  >
                    <img
                      src={m.url}
                      alt={m.altText || ''}
                      className="w-full h-full object-cover"
                    />
                    {m.isCover && (
                      <Badge className="absolute top-2 left-2" variant="secondary">
                        Cover
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop images here
                </p>
                <Button variant="outline" size="sm">
                  Upload Images
                </Button>
              </div>
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

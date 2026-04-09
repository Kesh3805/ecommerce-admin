import { useState } from 'react';
import { OptionGroup, VariantRow } from '@/components/products/types';
import { Loader2, Trash2, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { VariantPriceEditor } from '@/components/products/variant-price-editor';
import { VariantInventoryEditor } from '@/components/products/variant-inventory-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface VariantTableProps {
  optionGroups: OptionGroup[];
  rows: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
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

function parseMediaUrls(input: string): string[] {
  return normalizeMediaUrls(input.split(/[\n,|]/g));
}

export function VariantTable({ optionGroups, rows, onChange }: VariantTableProps) {
  const editableOptionGroups = optionGroups.filter((group) => group.name.trim().length > 0);
  const [uploadingByRowId, setUploadingByRowId] = useState<Record<string, boolean>>({});

  const handleUploadVariantMedia = async (rowId: string, files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setUploadingByRowId((current) => ({ ...current, [rowId]: true }));

    try {
      const graphQlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4100/graphql';
      const apiBaseUrl = new URL(graphQlUrl).origin;
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null;
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${apiBaseUrl}/api/media/upload`, {
          method: 'POST',
          body: formData,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Failed to upload ${file.name}`);
        }

        const payload = (await response.json()) as { url?: string };
        if (!payload.url) {
          throw new Error(`Upload endpoint did not return a URL for ${file.name}`);
        }

        uploadedUrls.push(toAbsoluteMediaUrl(payload.url));
      }

      onChange(
        rows.map((item) =>
          item.id === rowId
            ? { ...item, mediaUrls: normalizeMediaUrls([...(item.mediaUrls || []), ...uploadedUrls]) }
            : item,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload variant media.';
      window.alert(message);
    } finally {
      setUploadingByRowId((current) => ({ ...current, [rowId]: false }));
    }
  };

  const handleRemoveVariantMedia = (rowId: string, mediaIndex: number) => {
    onChange(
      rows.map((item) => {
        if (item.id !== rowId) {
          return item;
        }

        return {
          ...item,
          mediaUrls: item.mediaUrls.filter((_, index) => index !== mediaIndex),
        };
      }),
    );
  };

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No variants generated yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {editableOptionGroups.map((group) => (
            <TableHead key={group.id}>{group.name}</TableHead>
          ))}
          <TableHead>Price</TableHead>
          <TableHead>Inventory</TableHead>
          <TableHead>Policy</TableHead>
          <TableHead>Media</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead className="w-16">Delete</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            {editableOptionGroups.map((group) => (
              <TableCell key={group.id}>{row.options[group.name] || '—'}</TableCell>
            ))}
            <TableCell>
              <VariantPriceEditor
                value={row.price}
                onChange={(price) => onChange(rows.map((item) => (item.id === row.id ? { ...item, price } : item)))}
              />
            </TableCell>
            <TableCell>
              <VariantInventoryEditor
                value={row.inventory}
                onChange={(inventory) =>
                  onChange(rows.map((item) => (item.id === row.id ? { ...item, inventory } : item)))
                }
              />
            </TableCell>
            <TableCell>
              <Select
                value={row.inventoryPolicy}
                onValueChange={(inventoryPolicy) => {
                  if (!inventoryPolicy) {
                    return;
                  }

                  onChange(
                    rows.map((item) =>
                      item.id === row.id
                        ? { ...item, inventoryPolicy: inventoryPolicy as 'DENY' | 'CONTINUE' }
                        : item,
                    ),
                  );
                }}
              >
                <SelectTrigger className="w-30">
                  <SelectValue placeholder="Policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DENY">Deny</SelectItem>
                  <SelectItem value="CONTINUE">Continue</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <div className="space-y-2">
                {row.mediaUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {row.mediaUrls.map((url, index) => (
                      <div key={`${row.id}-media-${index}`} className="relative">
                        <img
                          src={url}
                          alt={`${row.sku || 'variant'} media ${index + 1}`}
                          className="h-10 w-10 rounded border object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Remove media ${index + 1} for ${row.sku || 'variant'}`}
                          className="absolute -right-2 -top-2 inline-flex h-4 w-4 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveVariantMedia(row.id, index)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No media</p>
                )}

                <Input
                  value={row.mediaUrls.join(', ')}
                  placeholder="Image URLs (comma/new line separated)"
                  onChange={(event) =>
                    onChange(
                      rows.map((item) =>
                        item.id === row.id
                          ? { ...item, mediaUrls: parseMediaUrls(event.target.value) }
                          : item,
                      ),
                    )
                  }
                  className="w-72"
                />

                <div className="flex items-center gap-2">
                  <input
                    id={`variant-media-upload-${row.id}`}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    aria-label="Upload variant media"
                    title="Upload variant media"
                    onChange={(event) => {
                      void handleUploadVariantMedia(row.id, event.target.files);
                      event.currentTarget.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={Boolean(uploadingByRowId[row.id])}
                    onClick={() => {
                      document.getElementById(`variant-media-upload-${row.id}`)?.click();
                    }}
                  >
                    {uploadingByRowId[row.id] ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : null}
                    Upload images
                  </Button>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Input
                value={row.sku}
                onChange={(event) =>
                  onChange(rows.map((item) => (item.id === row.id ? { ...item, sku: event.target.value } : item)))
                }
                className="w-36"
              />
            </TableCell>
            <TableCell>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
                aria-label="Delete variant row"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

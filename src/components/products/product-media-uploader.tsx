'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductMediaItem } from '@/components/products/types';

interface ProductMediaUploaderProps {
  media: ProductMediaItem[];
  onChange: (media: ProductMediaItem[]) => void;
  onUploadFiles?: (files: File[]) => Promise<void> | void;
}

export function ProductMediaUploader({ media, onChange, onUploadFiles }: ProductMediaUploaderProps) {
  // Track blob URLs for cleanup to prevent memory leaks
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup blob URLs when component unmounts or media changes
  useEffect(() => {
    return () => {
      // Revoke all blob URLs on unmount
      blobUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      blobUrlsRef.current.clear();
    };
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (onUploadFiles) {
        await onUploadFiles(acceptedFiles);
        return;
      }

      const nextMedia = acceptedFiles.map((file) => {
        const blobUrl = URL.createObjectURL(file);
        // Track the blob URL for cleanup
        blobUrlsRef.current.add(blobUrl);
        return {
          id: crypto.randomUUID(),
          url: blobUrl,
          name: file.name,
          size: file.size,
        };
      });

      onChange([...media, ...nextMedia]);
    },
    [media, onChange, onUploadFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
    },
  });

  const removeMedia = (id: string) => {
    const itemToRemove = media.find((item) => item.id === id);
    if (itemToRemove) {
      // Revoke the blob URL if it's a blob URL
      if (itemToRemove.url.startsWith('blob:')) {
        URL.revokeObjectURL(itemToRemove.url);
        blobUrlsRef.current.delete(itemToRemove.url);
      }
    }
    onChange(media.filter((item) => item.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Media</CardTitle>
        <CardDescription>Drag and drop files. Connect this to your upload endpoint for CDN storage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className="cursor-pointer rounded-lg border-2 border-dashed border-input p-8 text-center"
        >
          <input {...getInputProps()} />
          <ImagePlus className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive ? 'Drop files here...' : 'Drop product images here, or click to browse'}
          </p>
        </div>

        {media.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item) => (
              <div key={item.id} className="relative overflow-hidden rounded-md border">
                <img src={item.url} alt={item.name} className="h-28 w-full object-cover" />
                <div className="flex items-center justify-between p-2">
                  <p className="truncate text-xs">{item.name}</p>
                  <Button type="button" size="icon-xs" variant="ghost" onClick={() => removeMedia(item.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

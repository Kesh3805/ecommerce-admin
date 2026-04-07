'use client';

import { useCallback } from 'react';
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
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const nextMedia = acceptedFiles.map((file) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      }));

      onChange([...media, ...nextMedia]);

      if (onUploadFiles) {
        await onUploadFiles(acceptedFiles);
      }
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

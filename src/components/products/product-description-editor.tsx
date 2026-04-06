'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Code, Link2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProductDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProductDescriptionEditor({ value, onChange }: ProductDescriptionEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Link],
    content: value || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'min-h-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none',
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Description</CardTitle>
        <CardDescription>Use formatted content for details, materials, and care information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
            <Code className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const url = window.prompt('Enter URL');
              if (url) {
                editor?.chain().focus().setLink({ href: url }).run();
              }
            }}
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </div>
        <EditorContent editor={editor} />
      </CardContent>
    </Card>
  );
}

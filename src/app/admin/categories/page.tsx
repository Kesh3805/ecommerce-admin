'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  GET_CATEGORIES,
  CREATE_CATEGORY,
  UPDATE_CATEGORY,
  DELETE_CATEGORY,
} from '@/graphql/operations';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Tags, Pencil, Trash2 } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
  metadata?: unknown;
}

interface CategoriesData {
  categories: Category[];
}

type CategoryMetafieldDefinition = { key: string; label: string; type: 'text' | 'textarea' };

interface CategoryFormState {
  id?: number;
  name: string;
  slug: string;
  parent_id: string;
  metafieldsText: string;
}

const EMPTY_FORM: CategoryFormState = {
  name: '',
  slug: '',
  parent_id: '',
  metafieldsText: '',
};

function parseCategoryMetafields(metadata: unknown): CategoryMetafieldDefinition[] {
  const parsed = typeof metadata === 'string'
    ? (() => {
        try {
          return JSON.parse(metadata) as unknown;
        } catch {
          return null;
        }
      })()
    : metadata;

  const raw = (parsed as { metafields?: unknown } | null)?.metafields;
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: CategoryMetafieldDefinition[] = [];

  for (const item of raw) {
    const key = String((item as { key?: unknown })?.key ?? '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({
      key,
      label: String((item as { label?: unknown })?.label ?? '').trim() || key,
      type: String((item as { type?: unknown })?.type ?? '').toLowerCase() === 'textarea' ? 'textarea' : 'text',
    });
  }

  return normalized;
}

function metafieldsToText(definitions: CategoryMetafieldDefinition[]): string {
  return definitions.map((field) => `${field.key}|${field.label}|${field.type}`).join('\n');
}

function parseMetafieldsText(input: string): CategoryMetafieldDefinition[] {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const seen = new Set<string>();
  const parsed: CategoryMetafieldDefinition[] = [];

  for (const line of lines) {
    const [rawKey, rawLabel, rawType] = line.split('|').map((part) => part.trim());
    const key = String(rawKey ?? '').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    parsed.push({
      key,
      label: rawLabel || key,
      type: rawType?.toLowerCase() === 'textarea' ? 'textarea' : 'text',
    });
  }

  return parsed;
}

export default function CategoriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);

  const { data, loading, error, refetch } = useQuery<CategoriesData>(GET_CATEGORIES, {
    variables: {},
    fetchPolicy: 'cache-and-network',
  });

  const [createCategory, { loading: creating }] = useMutation(CREATE_CATEGORY, {
    onCompleted: () => {
      setShowModal(false);
      setForm(EMPTY_FORM);
      refetch();
    },
  });

  const [updateCategory, { loading: updating }] = useMutation(UPDATE_CATEGORY, {
    onCompleted: () => {
      setShowModal(false);
      setForm(EMPTY_FORM);
      refetch();
    },
  });

  const [deleteCategory, { loading: deleting }] = useMutation(DELETE_CATEGORY, {
    onCompleted: () => refetch(),
  });

  const categories = data?.categories ?? [];

  const categoryOptions = categories.filter((category) => category.id !== form.id);

  const handleCreate = () => {
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const handleEdit = (category: Category) => {
    setForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id ? String(category.parent_id) : '',
      metafieldsText: metafieldsToText(parseCategoryMetafields(category.metadata)),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      return;
    }

    const payload = {
      name: form.name.trim(),
      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      metafields: parseMetafieldsText(form.metafieldsText),
    };

    if (form.id) {
      await updateCategory({
        variables: {
          id: form.id,
          input: payload,
        },
      });
      return;
    }

    await createCategory({
      variables: {
        input: payload,
      },
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category?')) {
      return;
    }

    await deleteCategory({ variables: { id } });
  };

  const saving = creating || updating;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Tags className="h-8 w-8" />
            Categories
          </h1>
          <p className="mt-1 text-muted-foreground">Manage category taxonomy for storefront filtering and merchandising.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          {error.message}
        </div>
      )}

      {!loading && categories.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-semibold">No categories yet</h3>
          <p className="mt-2 text-muted-foreground">Create your first category to organize catalog navigation and filters.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Parent</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((category) => {
                const parent = categories.find((candidate) => candidate.id === category.parent_id);

                return (
                  <tr key={category.id} className="hover:bg-muted/40">
                    <td className="px-6 py-4 font-medium">{category.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{category.slug}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{parent?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(category)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={deleting}
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-xl font-semibold">{form.id ? 'Edit Category' : 'Create Category'}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Category name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Slug (optional)</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="category-slug"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Parent Category</label>
                <select
                  title="Parent category"
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={form.parent_id}
                  onChange={(event) => setForm((current) => ({ ...current, parent_id: event.target.value }))}
                >
                  <option value="">No parent</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Category Metafields</label>
                <textarea
                  className="min-h-28 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                  value={form.metafieldsText}
                  onChange={(event) => setForm((current) => ({ ...current, metafieldsText: event.target.value }))}
                  placeholder={"material|Material|text\ncare_instructions|Care Instructions|textarea"}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  One metafield per line: key|Label|type. type can be text or textarea.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button disabled={saving || !form.name.trim()} onClick={handleSave}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {form.id ? 'Save Changes' : 'Create Category'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

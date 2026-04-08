'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Loader2, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import { CREATE_BRAND, DELETE_BRAND, GET_BRANDS, GET_MY_STORES, UPDATE_BRAND } from '@/graphql/operations';
import { Button } from '@/components/ui/button';

interface Brand {
  brand_id: number;
  store_id: number;
  store_name?: string;
  name: string;
  slug?: string;
  created_at: string;
  updated_at: string;
}

interface BrandsData {
  brands: Brand[];
}

interface StoresData {
  myStores: Array<{ store_id: number; name: string }>;
}

interface BrandFormState {
  brand_id?: number;
  store_id: string;
  name: string;
}

const EMPTY_FORM: BrandFormState = {
  store_id: '',
  name: '',
};

export default function BrandsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<BrandFormState>(EMPTY_FORM);

  const { data: storesData } = useQuery<StoresData>(GET_MY_STORES);
  const stores = useMemo(() => storesData?.myStores ?? [], [storesData]);
  const defaultStoreId = stores[0]?.store_id;

  const { data, loading, error, refetch } = useQuery<BrandsData>(GET_BRANDS, {
    variables: { storeId: defaultStoreId ?? null },
    skip: !defaultStoreId,
    fetchPolicy: 'cache-and-network',
  });

  const [createBrand, { loading: creating }] = useMutation(CREATE_BRAND, {
    onCompleted: () => {
      setShowModal(false);
      setForm(EMPTY_FORM);
      refetch();
    },
  });

  const [updateBrand, { loading: updating }] = useMutation(UPDATE_BRAND, {
    onCompleted: () => {
      setShowModal(false);
      setForm(EMPTY_FORM);
      refetch();
    },
  });

  const [deleteBrand, { loading: deleting }] = useMutation(DELETE_BRAND, {
    onCompleted: () => refetch(),
  });

  const brands = data?.brands ?? [];
  const saving = creating || updating;

  const storeMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const store of stores) {
      map.set(store.store_id, store.name);
    }

    return map;
  }, [stores]);

  const handleCreate = () => {
    setForm({
      brand_id: undefined,
      store_id: defaultStoreId ? String(defaultStoreId) : '',
      name: '',
    });
    setShowModal(true);
  };

  const handleEdit = (brand: Brand) => {
    setForm({
      brand_id: brand.brand_id,
      store_id: String(brand.store_id),
      name: brand.name,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const storeId = Number(form.store_id);

    if (!name || !Number.isInteger(storeId) || storeId <= 0) {
      return;
    }

    if (form.brand_id) {
      await updateBrand({
        variables: {
          input: {
            brand_id: form.brand_id,
            name,
          },
        },
      });
      return;
    }

    await createBrand({
      variables: {
        input: {
          name,
          store_id: storeId,
        },
      },
    });
  };

  const handleDelete = async (brandId: number) => {
    if (!confirm('Delete this brand?')) {
      return;
    }

    await deleteBrand({ variables: { brandId } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Tag className="h-8 w-8" />
            Brands
          </h1>
          <p className="mt-1 text-muted-foreground">Manage reusable brand records for catalog organization.</p>
        </div>
        <Button onClick={handleCreate} disabled={!defaultStoreId}>
          <Plus className="mr-2 h-4 w-4" />
          New Brand
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

      {!loading && brands.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-semibold">No brands yet</h3>
          <p className="mt-2 text-muted-foreground">Create your first brand for this store.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Store</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {brands.map((brand) => (
                <tr key={brand.brand_id} className="hover:bg-muted/40">
                  <td className="px-6 py-4 font-medium">{brand.name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{brand.slug || '-'}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{brand.store_name || storeMap.get(brand.store_id) || brand.store_id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(brand)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleting}
                        onClick={() => handleDelete(brand.brand_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-xl font-semibold">{form.brand_id ? 'Edit Brand' : 'Create Brand'}</h2>
            <div className="mt-4 space-y-4">
              {!form.brand_id && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Store</label>
                  <select
                    title="Store"
                    className="w-full rounded-md border bg-background px-3 py-2"
                    value={form.store_id}
                    onChange={(event) => setForm((current) => ({ ...current, store_id: event.target.value }))}
                  >
                    <option value="">Select store</option>
                    {stores.map((store) => (
                      <option key={store.store_id} value={store.store_id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Brand name"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button disabled={saving || !form.name.trim() || (!form.brand_id && !form.store_id)} onClick={handleSave}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {form.brand_id ? 'Save Changes' : 'Create Brand'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

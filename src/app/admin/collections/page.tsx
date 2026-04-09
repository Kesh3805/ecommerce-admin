/**
 * Collections Management Page - Admin
 * Manages product collections with backend integration
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import {
  GET_COLLECTIONS,
  GET_COLLECTION,
  GET_PRODUCTS,
  GET_MY_STORES,
} from '@/graphql/operations';
import {
  CREATE_COLLECTION,
  UPDATE_COLLECTION,
  DELETE_COLLECTION,
  SET_COLLECTION_RULES,
} from '@/graphql/merchandising';
import { Button } from '@/components/ui/button';
import { Library, Plus, Trash2, Edit, Loader2 } from 'lucide-react';

interface Collection {
  id: number;
  name: string;
  slug: string;
  description?: string;
  type: 'MANUAL' | 'AUTOMATED';
  isVisible: boolean;
  productCount: number;
  imageUrl?: string;
}

interface CollectionRule {
  ruleId?: number;
  field: string;
  operator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'GREATER_THAN'
    | 'LESS_THAN'
    | 'GREATER_THAN_OR_EQUAL'
    | 'LESS_THAN_OR_EQUAL'
    | 'CONTAINS'
    | 'NOT_CONTAINS'
    | 'STARTS_WITH'
    | 'IS_SET'
    | 'IS_NOT_SET';
  value: string;
  valueType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ARRAY';
  ruleGroup: number;
}

interface CollectionDetailData {
  collection: {
    id: number;
    name: string;
    slug: string;
    description?: string;
    type: 'MANUAL' | 'AUTOMATED';
    isVisible: boolean;
    imageUrl?: string;
    metaTitle?: string;
    metaDescription?: string;
    products?: Array<{ product_id: number; handle?: string; title: string; status: string }>;
    rules?: CollectionRule[];
  };
}

interface CollectionsData {
  collections: Collection[];
}

interface ActiveProductsData {
  products: {
    items: Array<{
      id: number;
      handle?: string;
      title: string;
      status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    }>;
  };
}

interface StoresData {
  myStores: Array<{ store_id: number; name: string }>;
}

const RULE_FIELD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'brand', label: 'Brand' },
  { value: 'title', label: 'Product Title' },
  { value: 'description', label: 'Description' },
  { value: 'status', label: 'Status' },
  { value: 'handle', label: 'Handle' },
  { value: 'product_id', label: 'Product ID' },
  { value: 'category', label: 'Category ID' },
  { value: 'price', label: 'Price' },
  { value: 'created_at', label: 'Created At' },
  { value: 'updated_at', label: 'Updated At' },
];

const RULE_OPERATOR_OPTIONS: CollectionRule['operator'][] = [
  'EQUALS',
  'NOT_EQUALS',
  'GREATER_THAN',
  'LESS_THAN',
  'GREATER_THAN_OR_EQUAL',
  'LESS_THAN_OR_EQUAL',
  'CONTAINS',
  'NOT_CONTAINS',
  'STARTS_WITH',
  'IS_SET',
  'IS_NOT_SET',
];

const RULE_VALUE_TYPE_OPTIONS: CollectionRule['valueType'][] = ['STRING', 'NUMBER', 'BOOLEAN', 'ARRAY'];

export default function CollectionsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newCollection, setNewCollection] = useState<{
    name: string;
    description: string;
    type: 'MANUAL' | 'AUTOMATED';
  }>({
    name: '',
    description: '',
    type: 'MANUAL',
  });
  const [editCollection, setEditCollection] = useState({
    id: 0,
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    isVisible: true,
    type: 'MANUAL' as 'MANUAL' | 'AUTOMATED',
  });
  const [rules, setRules] = useState<CollectionRule[]>([]);
  const [selectedManualProductIds, setSelectedManualProductIds] = useState<number[]>([]);
  const [manualProductSearch, setManualProductSearch] = useState('');

  // Fetch stores to get current store ID
  const { data: storesData } = useQuery<StoresData>(GET_MY_STORES);
  const storeId = storesData?.myStores?.[0]?.store_id || 1;

  // Fetch collections
  const { data, loading, error, refetch } = useQuery<CollectionsData>(GET_COLLECTIONS, {
    variables: { filter: { store_id: storeId, is_visible: true } },
    fetchPolicy: 'network-only',
  });

  const { data: activeProductsData, loading: loadingActiveProducts } = useQuery<ActiveProductsData>(GET_PRODUCTS, {
    variables: {
      filter: {
        store_id: storeId,
        status: 'ACTIVE',
      },
      pagination: {
        page: 1,
        limit: 500,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  // Create collection mutation
  const [createCollection, { loading: creating }] = useMutation(CREATE_COLLECTION, {
    onCompleted: () => {
      setShowCreateModal(false);
      setNewCollection({ name: '', description: '', type: 'MANUAL' });
      refetch();
    },
  });

  const [updateCollection, { loading: updating }] = useMutation(UPDATE_COLLECTION, {
    onCompleted: () => refetch(),
  });

  const [setCollectionRules, { loading: savingRules }] = useMutation(SET_COLLECTION_RULES, {
    onCompleted: () => refetch(),
  });

  // Delete collection mutation
  const [deleteCollection] = useMutation(DELETE_COLLECTION, {
    onCompleted: () => refetch(),
  });

  const [getCollectionDetail, { loading: loadingDetail }] = useLazyQuery<CollectionDetailData>(GET_COLLECTION, {
    fetchPolicy: 'network-only',
  });

  const handleCreate = async () => {
    if (!newCollection.name.trim()) return;
    
    const slug = newCollection.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    await createCollection({
      variables: {
        input: {
          name: newCollection.name,
          slug,
          description: newCollection.description,
          collection_type: newCollection.type,
          store_id: storeId,
        },
      },
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    await deleteCollection({ variables: { collectionId: id } });
  };

  const handleEditOpen = async (id: number) => {
    const result = await getCollectionDetail({ variables: { id } });
    const detail = result.data?.collection;
    if (!detail) {
      return;
    }

    setEditCollection({
      id: detail.id,
      name: detail.name,
      slug: detail.slug,
      description: detail.description || '',
      imageUrl: detail.imageUrl || '',
      isVisible: detail.isVisible,
      type: detail.type,
    });
    setRules(
      (detail.rules || []).map((rule) => ({
        ...rule,
        valueType: rule.valueType || 'STRING',
        ruleGroup: Number.isInteger(rule.ruleGroup) ? rule.ruleGroup : 0,
      })),
    );
    setSelectedManualProductIds(
      (detail.products || [])
        .filter((product) => product.status === 'ACTIVE')
        .map((product) => product.product_id),
    );
    setManualProductSearch('');
    setShowEditModal(true);
  };

  const handleRuleChange = (index: number, patch: Partial<CollectionRule>) => {
    setRules((current) =>
      current.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)),
    );
  };

  const handleSaveEdit = async () => {
    if (!editCollection.id) {
      return;
    }

    const parsedProductIds = Array.from(new Set(selectedManualProductIds))
      .filter((value) => Number.isInteger(value) && value > 0);

    await updateCollection({
      variables: {
        input: {
          collection_id: editCollection.id,
          name: editCollection.name,
          slug: editCollection.slug,
          description: editCollection.description,
          image_url: editCollection.imageUrl || null,
          is_visible: editCollection.isVisible,
          ...(editCollection.type === 'MANUAL' ? { product_ids: parsedProductIds } : {}),
        },
      },
    });

    if (editCollection.type === 'AUTOMATED') {
      const normalizedRules = rules
        .filter((rule) => rule.field.trim() && (rule.operator === 'IS_SET' || rule.operator === 'IS_NOT_SET' || rule.value.trim()))
        .map((rule) => ({
          rule_group: rule.ruleGroup,
          field: rule.field.trim(),
          operator: rule.operator,
          value: rule.value || '1',
          value_type: rule.valueType,
        }));

      await setCollectionRules({
        variables: {
          collectionId: editCollection.id,
          rules: normalizedRules,
        },
      });
    }

    setShowEditModal(false);
  };

  const collections = data?.collections || [];
  const activeProducts = activeProductsData?.products?.items || [];
  const filteredActiveProducts = activeProducts.filter((product) => {
    const query = manualProductSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [product.handle || '', product.title, String(product.id)]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Library className="h-8 w-8" />
            Collections
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage product collections for your store
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Collection
        </Button>
      </div>

      {/* Loading state */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          Error loading collections: {error.message}
        </div>
      )}

      {/* Collections table */}
      {!loading && collections.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Library className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No collections yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first collection to organize products
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Collection
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {collections.map((collection) => (
                <tr key={collection.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{collection.name}</div>
                      <div className="text-sm text-muted-foreground">{collection.slug}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      collection.type === 'MANUAL' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}>
                      {collection.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {collection.productCount} products
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-sm ${
                      collection.isVisible ? 'text-green-600' : 'text-muted-foreground'
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${
                        collection.isVisible ? 'bg-green-500' : 'bg-muted-foreground'
                      }`} />
                      {collection.isVisible ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditOpen(collection.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(collection.id)}
                        className="text-destructive hover:text-destructive"
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4">Create Collection</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newCollection.name}
                  onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="e.g., Summer Collection"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newCollection.description}
                  onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  rows={3}
                  placeholder="Describe this collection..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  title="Collection type"
                  value={newCollection.type}
                  onChange={(e) => setNewCollection({ ...newCollection, type: e.target.value as 'MANUAL' | 'AUTOMATED' })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="MANUAL">Manual - Add products manually</option>
                  <option value="AUTOMATED">Automated - Use rules to select products</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating || !newCollection.name.trim()}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-6 shadow-lg">
            <h2 className="text-xl font-bold">Edit Collection</h2>

            {loadingDetail ? (
              <div className="py-8 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Name</label>
                  <input
                    type="text"
                    aria-label="Collection name"
                    value={editCollection.name}
                    onChange={(e) => setEditCollection((current) => ({ ...current, name: e.target.value }))}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Slug</label>
                  <input
                    type="text"
                    aria-label="Collection slug"
                    value={editCollection.slug}
                    onChange={(e) => setEditCollection((current) => ({ ...current, slug: e.target.value }))}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <textarea
                    aria-label="Collection description"
                    value={editCollection.description}
                    onChange={(e) => setEditCollection((current) => ({ ...current, description: e.target.value }))}
                    className="w-full rounded-md border bg-background px-3 py-2"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Image URL</label>
                  <input
                    type="text"
                    aria-label="Collection image URL"
                    value={editCollection.imageUrl}
                    onChange={(e) => setEditCollection((current) => ({ ...current, imageUrl: e.target.value }))}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editCollection.isVisible}
                    onChange={(e) => setEditCollection((current) => ({ ...current, isVisible: e.target.checked }))}
                  />
                  Visible in storefront
                </label>

                {editCollection.type === 'MANUAL' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Active Products (select by handle)</label>
                    <input
                      type="text"
                      aria-label="Search active products"
                      value={manualProductSearch}
                      onChange={(e) => setManualProductSearch(e.target.value)}
                      className="mb-2 w-full rounded-md border bg-background px-3 py-2"
                      placeholder="Search by handle, title, or product ID"
                    />
                    <select
                      multiple
                      aria-label="Manual collection active products"
                      value={selectedManualProductIds.map((id) => String(id))}
                      onChange={(e) => {
                        const nextIds = Array.from(e.target.selectedOptions)
                          .map((option) => Number(option.value))
                          .filter((id) => Number.isInteger(id) && id > 0);
                        setSelectedManualProductIds(nextIds);
                      }}
                      className="w-full rounded-md border bg-background px-3 py-2"
                      size={Math.min(Math.max(filteredActiveProducts.length, 6), 12)}
                    >
                      {filteredActiveProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.handle || `product-${product.id}`} - {product.title}
                        </option>
                      ))}
                    </select>
                    {loadingActiveProducts ? (
                      <p className="mt-1 text-xs text-muted-foreground">Loading active products...</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Selected: {selectedManualProductIds.length} active product(s). Hold Ctrl (Windows) to select multiple items.
                    </p>
                  </div>
                )}

                {editCollection.type === 'AUTOMATED' && (
                  <div className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold">Automation Rules</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setRules((current) => [
                            ...current,
                            {
                              field: 'brand',
                              operator: 'CONTAINS',
                              value: '',
                              valueType: 'STRING',
                              ruleGroup: 0,
                            },
                          ])
                        }
                      >
                        Add Rule
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {rules.map((rule, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2">
                          <select
                            title="Rule operator"
                            className="col-span-3 rounded border bg-background px-2 py-1 text-sm"
                            value={rule.field}
                            onChange={(e) => handleRuleChange(index, { field: e.target.value })}
                          >
                            {RULE_FIELD_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            title="Rule operator"
                            className="col-span-3 rounded border bg-background px-2 py-1 text-sm"
                            value={rule.operator}
                            onChange={(e) => handleRuleChange(index, { operator: e.target.value as CollectionRule['operator'] })}
                          >
                            {RULE_OPERATOR_OPTIONS.map((operator) => (
                              <option key={operator} value={operator}>
                                {operator}
                              </option>
                            ))}
                          </select>
                          {rule.operator === 'IS_SET' || rule.operator === 'IS_NOT_SET' ? (
                            <div className="col-span-2 rounded border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                              No value needed
                            </div>
                          ) : (
                            <input
                              className="col-span-2 rounded border bg-background px-2 py-1 text-sm"
                              value={rule.value}
                              onChange={(e) => handleRuleChange(index, { value: e.target.value })}
                              placeholder="value"
                            />
                          )}
                          <select
                            title="Rule value type"
                            className="col-span-2 rounded border bg-background px-2 py-1 text-sm"
                            value={rule.valueType}
                            onChange={(e) => handleRuleChange(index, { valueType: e.target.value as CollectionRule['valueType'] })}
                          >
                            {RULE_VALUE_TYPE_OPTIONS.map((valueType) => (
                              <option key={valueType} value={valueType}>
                                {valueType}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            title="Rule group"
                            className="col-span-1 rounded border bg-background px-2 py-1 text-sm"
                            value={rule.ruleGroup}
                            onChange={(e) => handleRuleChange(index, { ruleGroup: Number(e.target.value || 0) })}
                          />
                          <button
                            className="col-span-1 rounded border px-2 py-1 text-sm hover:bg-muted"
                            onClick={() => setRules((current) => current.filter((_, i) => i !== index))}
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Use rule groups to combine conditions. Group 0 is the default group.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updating || savingRules || !editCollection.name.trim()}>
                {updating || savingRules ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

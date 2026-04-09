'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_CATEGORIES } from '@/graphql/operations';
import { Loader2, Tags } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  metadata?: unknown;
  path: string[];
  depth: number;
}

const UNSELECTED_CATEGORY_VALUE = '__unselected__';

function categoryDepthPaddingClass(depth: number): string {
  switch (depth) {
    case 0:
      return 'pl-0';
    case 1:
      return 'pl-3';
    case 2:
      return 'pl-6';
    case 3:
      return 'pl-9';
    default:
      return 'pl-12';
  }
}

function parseCategoryPathFromMetadata(metadata: unknown): string[] {
  if (!metadata) {
    return [];
  }

  const parsed = typeof metadata === 'string'
    ? (() => {
        try {
          return JSON.parse(metadata) as unknown;
        } catch {
          return null;
        }
      })()
    : metadata;

  const rawPath = (parsed as { taxonomy?: { path_tree?: unknown } } | null)?.taxonomy?.path_tree;
  if (typeof rawPath !== 'string') {
    return [];
  }

  return rawPath.split('>').map((segment) => segment.trim()).filter((segment) => segment.length > 0);
}

function parseMetadata(metadata: unknown): {
  metafieldCount: number;
  templateCount: number;
  templateVersion: number | null;
  managedBy: string;
  isPredefined: boolean;
} {
  const parsed = typeof metadata === 'string'
    ? (() => {
        try {
          return JSON.parse(metadata) as unknown;
        } catch {
          return null;
        }
      })()
    : metadata;

  const normalized = (parsed as { metafields?: unknown; option_templates?: unknown; optionTemplates?: unknown } | null) ?? null;
  const rawMetafields = normalized?.metafields;
  const rawTemplates = normalized?.option_templates ?? normalized?.optionTemplates;
  const templateVersionRaw = (parsed as { template_version?: unknown } | null)?.template_version;
  const managedByRaw = (parsed as { managed_by?: unknown } | null)?.managed_by;
  const isPredefinedRaw = (parsed as { is_predefined?: unknown } | null)?.is_predefined;

  return {
    metafieldCount: Array.isArray(rawMetafields) ? rawMetafields.length : 0,
    templateCount: Array.isArray(rawTemplates) ? rawTemplates.length : 0,
    templateVersion: Number.isInteger(templateVersionRaw) ? Number(templateVersionRaw) : null,
    managedBy: typeof managedByRaw === 'string' && managedByRaw.trim().length > 0 ? managedByRaw : 'unknown',
    isPredefined: isPredefinedRaw === true,
  };
}

export default function CategoriesPage() {
  const { data, loading, error } = useQuery<CategoriesData>(GET_CATEGORIES, {
    variables: {},
    fetchPolicy: 'cache-and-network',
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(UNSELECTED_CATEGORY_VALUE);

  const categories = data?.categories ?? [];

  const hierarchy = useMemo(() => {
    const byId = new Map<number, Category>();
    for (const category of categories) {
      byId.set(category.id, category);
    }

    const parentMap = new Map<number, number | null>();
    const childrenByParentId = new Map<number | null, Category[]>();

    for (const category of categories) {
      const normalizedParentId = Number.isInteger(category.parent_id) && byId.has(Number(category.parent_id))
        ? Number(category.parent_id)
        : null;

      parentMap.set(category.id, normalizedParentId);

      const siblings = childrenByParentId.get(normalizedParentId) ?? [];
      siblings.push(category);
      childrenByParentId.set(normalizedParentId, siblings);
    }

    const sortByName = (left: Category, right: Category) => left.name.localeCompare(right.name);
    for (const [parentId, siblings] of childrenByParentId.entries()) {
      childrenByParentId.set(parentId, [...siblings].sort(sortByName));
    }

    const pathCache = new Map<number, string[]>();
    const resolvePath = (category: Category, trail = new Set<number>()): string[] => {
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

      const parentId = parentMap.get(category.id) ?? null;
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

    const nodeById = new Map<number, CategoryNode>();
    for (const category of categories) {
      const path = resolvePath(category);
      nodeById.set(category.id, {
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: parentMap.get(category.id) ?? null,
        metadata: category.metadata,
        path,
        depth: Math.max(path.length - 1, 0),
      });
    }

    const childrenByParentNodeId = new Map<number | null, CategoryNode[]>();
    for (const [parentId, siblings] of childrenByParentId.entries()) {
      childrenByParentNodeId.set(
        parentId,
        siblings
          .map((sibling) => nodeById.get(sibling.id))
          .filter((node): node is CategoryNode => Boolean(node)),
      );
    }

    const orderedNodes: CategoryNode[] = [];
    const visited = new Set<number>();

    const walk = (parentId: number | null): void => {
      const children = childrenByParentNodeId.get(parentId) ?? [];
      for (const child of children) {
        if (visited.has(child.id)) {
          continue;
        }

        visited.add(child.id);
        orderedNodes.push(child);
        walk(child.id);
      }
    };

    walk(null);

    for (const node of [...nodeById.values()].sort((left, right) => left.name.localeCompare(right.name))) {
      if (visited.has(node.id)) {
        continue;
      }

      visited.add(node.id);
      orderedNodes.push(node);
      walk(node.id);
    }

    return {
      nodeById,
      orderedNodes,
      childrenByParentId: childrenByParentNodeId,
    };
  }, [categories]);

  const selectedPath = useMemo(() => {
    if (selectedCategoryId === UNSELECTED_CATEGORY_VALUE) {
      return [] as CategoryNode[];
    }

    const selectedId = Number(selectedCategoryId);
    if (!Number.isInteger(selectedId) || !hierarchy.nodeById.has(selectedId)) {
      return [] as CategoryNode[];
    }

    const path: CategoryNode[] = [];
    const visited = new Set<number>();
    let current = hierarchy.nodeById.get(selectedId) ?? null;

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.push(current);
      current = current.parentId && hierarchy.nodeById.has(current.parentId)
        ? hierarchy.nodeById.get(current.parentId) ?? null
        : null;
    }

    return path.reverse();
  }, [hierarchy.nodeById, selectedCategoryId]);

  const categoryLevels = useMemo(() => {
    const levels: CategoryNode[][] = [];
    levels.push(hierarchy.childrenByParentId.get(null) ?? []);

    for (const selectedNode of selectedPath) {
      const children = hierarchy.childrenByParentId.get(selectedNode.id) ?? [];
      if (children.length === 0) {
        break;
      }

      levels.push(children);
    }

    return levels;
  }, [hierarchy.childrenByParentId, selectedPath]);

  const visibleCategoryIds = useMemo(() => {
    if (selectedCategoryId === UNSELECTED_CATEGORY_VALUE) {
      return null as Set<number> | null;
    }

    const selectedId = Number(selectedCategoryId);
    if (!Number.isInteger(selectedId) || !hierarchy.nodeById.has(selectedId)) {
      return null as Set<number> | null;
    }

    const ids = new Set<number>();
    const stack = [selectedId];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (ids.has(id)) {
        continue;
      }

      ids.add(id);
      const children = hierarchy.childrenByParentId.get(id) ?? [];
      for (const child of children) {
        stack.push(child.id);
      }
    }

    return ids;
  }, [hierarchy.childrenByParentId, hierarchy.nodeById, selectedCategoryId]);

  const displayCategories = useMemo(() => {
    if (!visibleCategoryIds) {
      return hierarchy.orderedNodes;
    }

    return hierarchy.orderedNodes.filter((category) => visibleCategoryIds.has(category.id));
  }, [hierarchy.orderedNodes, visibleCategoryIds]);

  const handleCategoryLevelChange = (levelIndex: number, value: string): void => {
    if (value === UNSELECTED_CATEGORY_VALUE) {
      if (levelIndex === 0) {
        setSelectedCategoryId(UNSELECTED_CATEGORY_VALUE);
        return;
      }

      const parentSelection = selectedPath[levelIndex - 1];
      setSelectedCategoryId(parentSelection ? String(parentSelection.id) : UNSELECTED_CATEGORY_VALUE);
      return;
    }

    setSelectedCategoryId(value);
  };

  const selectedCategoryLabel = useMemo(() => {
    if (selectedPath.length === 0) {
      return 'All categories';
    }

    return selectedPath.map((node) => node.name).join(' > ');
  }, [selectedPath]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Tags className="h-8 w-8" />
          Categories
        </h1>
        <p className="text-muted-foreground">Category taxonomy is managed in the database only. App-level create/edit/delete is disabled.</p>
      </div>

      <div className="rounded-lg border border-amber-300/50 bg-amber-50/60 p-4 text-sm text-amber-900">
        Use DB scripts to maintain taxonomy and templates. Recommended: scripts/seed-enriched-categories.js.
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

      {categories.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-base font-semibold">Category Explorer</h2>
          <p className="mt-1 text-sm text-muted-foreground">Navigate taxonomy step by step (parent → child → sub-child).</p>

          <div className="mt-4 space-y-3">
            {categoryLevels.map((levelCategories, levelIndex) => {
              const selectedValue = selectedPath[levelIndex] ? String(selectedPath[levelIndex].id) : UNSELECTED_CATEGORY_VALUE;

              return (
                <div key={`level-${levelIndex}`} className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {levelIndex === 0 ? 'Parent Category' : `Subcategory Level ${levelIndex + 1}`}
                  </p>
                  <Select
                    value={selectedValue}
                    onValueChange={(value) => {
                      if (value) {
                        handleCategoryLevelChange(levelIndex, value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full md:max-w-xl">
                      <SelectValue placeholder={levelIndex === 0 ? 'Select parent category' : 'Select subcategory'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNSELECTED_CATEGORY_VALUE}>
                        {levelIndex === 0 ? 'All categories' : 'Keep parent selection'}
                      </SelectItem>
                      {levelCategories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Current selection: <span className="font-medium text-foreground">{selectedCategoryLabel}</span>
          </p>
        </div>
      )}

      {!loading && categories.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <h3 className="text-lg font-semibold">No categories found</h3>
          <p className="mt-2 text-muted-foreground">Seed predefined categories in DB before onboarding products.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Parent</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Path</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Option Templates</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Metafields</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Template Info</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayCategories.map((category) => {
                const { metafieldCount, templateCount, templateVersion, managedBy, isPredefined } = parseMetadata(category.metadata);
                const parentName = category.parentId ? hierarchy.nodeById.get(category.parentId)?.name ?? '-' : '-';
                return (
                  <tr key={category.id} className="hover:bg-muted/40">
                    <td className="px-6 py-4 font-medium">
                      <span className={categoryDepthPaddingClass(category.depth)}>{category.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{category.slug}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{parentName}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{category.path.join(' > ')}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{templateCount}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{metafieldCount}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      v{templateVersion ?? '-'} | {managedBy} | {isPredefined ? 'predefined' : 'custom'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

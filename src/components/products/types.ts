export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface ProductMediaItem {
  id: string;
  url: string;
  name: string;
  size: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  values: string[];
}

export interface VariantRow {
  id: string;
  options: Record<string, string>;
  sku: string;
  price: number;
  inventory: number;
  inventoryPolicy: 'DENY' | 'CONTINUE';
}

export interface CategoryMetafield {
  key: string;
  label: string;
  type: 'text' | 'textarea';
}

export interface CategoryOption {
  id: string;
  label: string;
  metafields: CategoryMetafield[];
}

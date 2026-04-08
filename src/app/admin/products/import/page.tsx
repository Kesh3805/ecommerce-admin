'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@apollo/client/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Upload } from 'lucide-react';
import { BULK_IMPORT_PRODUCTS, GET_MY_STORES } from '@/graphql/operations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const REQUIRED_COLUMNS = ['handle'];
const OPTIONAL_COLUMNS = [
  'parent_handle',
  'title',
  'category_slugs',
  'option1_name',
  'option1_values',
  'option2_name',
  'option2_values',
  'option3_name',
  'option3_values',
  'brand',
  'description',
  'media_urls',
  'country_codes',
  'variant_option1_value',
  'variant_option2_value',
  'variant_option3_value',
  'variant_sku',
  'variant_barcode',
  'variant_price',
  'variant_compare_at_price',
  'variant_cost_price',
  'variant_weight',
  'variant_weight_unit',
  'variant_inventory_policy',
  'variant_inventory',
  'variant_media_urls',
];

const TEMPLATE_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

const TEMPLATE_ROWS: Array<Record<string, string>> = [
  {
    handle: 'classic-cotton-tee',
    parent_handle: '',
    title: 'Classic Cotton Tee',
    category_slugs: 'tops|summer',
    option1_name: 'Size',
    option1_values: 'S|M|L|XL',
    option2_name: 'Color',
    option2_values: 'Black|White|Navy',
    option3_name: '',
    option3_values: '',
    brand: 'Alice Apparel',
    description: 'Everyday cotton t-shirt.',
    media_urls: 'https://images.example.com/products/classic-cotton-tee.jpg|https://images.example.com/products/classic-cotton-tee-back.jpg',
    country_codes: 'US|CA',
    variant_option1_value: '',
    variant_option2_value: '',
    variant_option3_value: '',
    variant_sku: '',
    variant_barcode: '',
    variant_price: '',
    variant_compare_at_price: '',
    variant_cost_price: '',
    variant_weight: '',
    variant_weight_unit: '',
    variant_inventory_policy: '',
    variant_inventory: '',
    variant_media_urls: '',
  },
  {
    handle: 'classic-cotton-tee',
    parent_handle: 'classic-cotton-tee',
    title: '',
    category_slugs: '',
    option1_name: '',
    option1_values: '',
    option2_name: '',
    option2_values: '',
    option3_name: '',
    option3_values: '',
    brand: '',
    description: '',
    media_urls: '',
    country_codes: '',
    variant_option1_value: 'M',
    variant_option2_value: 'Black',
    variant_option3_value: '',
    variant_sku: 'CCT-M-BLK',
    variant_barcode: '1234567890123',
    variant_price: '39.90',
    variant_compare_at_price: '49.90',
    variant_cost_price: '18.00',
    variant_weight: '0.35',
    variant_weight_unit: 'kg',
    variant_inventory_policy: 'DENY',
    variant_inventory: '24',
    variant_media_urls: 'https://images.example.com/products/classic-cotton-tee-black-m-front.jpg|https://images.example.com/products/classic-cotton-tee-black-m-back.jpg',
  },
];

type BulkImportRowInput = {
  row_number: number;
  title?: string;
  handle?: string;
  parent_handle?: string;
  category_slugs?: string;
  option1_name?: string;
  option1_values?: string;
  option2_name?: string;
  option2_values?: string;
  option3_name?: string;
  option3_values?: string;
  brand?: string;
  description?: string;
  media_url?: string;
  country_codes?: string;
  variant_option1_value?: string;
  variant_option2_value?: string;
  variant_option3_value?: string;
  variant_sku?: string;
  variant_barcode?: string;
  variant_price?: string;
  variant_compare_at_price?: string;
  variant_cost_price?: string;
  variant_weight?: string;
  variant_weight_unit?: string;
  variant_inventory_policy?: string;
  variant_inventory?: string;
  variant_media_urls?: string;
};

type BulkImportResultRow = {
  row_number: number;
  success: boolean;
  message: string;
  product_id?: number;
  handle?: string;
};

type BulkImportResponse = {
  bulkImportProducts: {
    total_rows: number;
    success_count: number;
    failure_count: number;
    results: BulkImportResultRow[];
  };
};

type StoresData = {
  myStores: Array<{ store_id: number; name: string }>;
};

type CsvRow = Record<string, string>;

function toCsvLine(values: string[]) {
  return values
    .map((value) => {
      const safe = String(value ?? '');
      if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
        return `"${safe.replace(/"/g, '""')}"`;
      }
      return safe;
    })
    .join(',');
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }

      currentRow.push(currentCell);
      currentCell = '';

      if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((cell) => cell.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function getOptional(row: CsvRow, key: string): string | undefined {
  const value = row[key]?.trim();
  return value ? value : undefined;
}

export default function ProductImportPage() {
  const [fileName, setFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkImportRowInput[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

  const { data: storesData, loading: storesLoading } = useQuery<StoresData>(GET_MY_STORES);
  const storeOptions = useMemo(() => storesData?.myStores ?? [], [storesData]);

  useEffect(() => {
    if (selectedStoreId != null) {
      return;
    }

    const firstStoreId = storeOptions[0]?.store_id;
    if (firstStoreId) {
      setSelectedStoreId(firstStoreId);
    }
  }, [selectedStoreId, storeOptions]);

  const [runImport, { loading, data }] = useMutation<BulkImportResponse>(BULK_IMPORT_PRODUCTS);

  const templateCsv = useMemo(() => {
    const header = TEMPLATE_COLUMNS;
    const lines = [toCsvLine(header), ...TEMPLATE_ROWS.map((templateRow) => toCsvLine(TEMPLATE_COLUMNS.map((column) => templateRow[column] || '')))];
    return lines.join('\n');
  }, []);

  const handleDownloadTemplate = () => {
    const blob = new Blob([templateCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setRows([]);
    setParseError(null);

    if (!file) {
      setFileName('');
      return;
    }

    setFileName(file.name);

    try {
      const text = await file.text();
      const matrix = parseCsv(text);

      if (matrix.length < 2) {
        throw new Error('CSV must include header and at least one data row.');
      }

      const headers = matrix[0].map((header) => header.trim().toLowerCase());
      const missingHeaders = REQUIRED_COLUMNS.filter((required) => !headers.includes(required));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required header(s): ${missingHeaders.join(', ')}`);
      }

      const parsedRows: BulkImportRowInput[] = matrix
        .slice(1)
        .map((cells, index) => {
          const mapped: CsvRow = {};
          headers.forEach((header, headerIndex) => {
            mapped[header] = String(cells[headerIndex] ?? '').trim();
          });

          const rowNumber = index + 2;
          return {
            row_number: rowNumber,
            title: getOptional(mapped, 'title'),
            handle: getOptional(mapped, 'handle'),
            parent_handle: getOptional(mapped, 'parent_handle'),
            category_slugs: getOptional(mapped, 'category_slugs'),
            option1_name: getOptional(mapped, 'option1_name'),
            option1_values: getOptional(mapped, 'option1_values'),
            option2_name: getOptional(mapped, 'option2_name'),
            option2_values: getOptional(mapped, 'option2_values'),
            option3_name: getOptional(mapped, 'option3_name'),
            option3_values: getOptional(mapped, 'option3_values'),
            brand: getOptional(mapped, 'brand'),
            description: getOptional(mapped, 'description'),
            media_url: getOptional(mapped, 'media_urls') || getOptional(mapped, 'media_url'),
            country_codes: getOptional(mapped, 'country_codes'),
            variant_option1_value: getOptional(mapped, 'variant_option1_value'),
            variant_option2_value: getOptional(mapped, 'variant_option2_value'),
            variant_option3_value: getOptional(mapped, 'variant_option3_value'),
            variant_sku: getOptional(mapped, 'variant_sku'),
            variant_barcode: getOptional(mapped, 'variant_barcode'),
            variant_price: getOptional(mapped, 'variant_price'),
            variant_compare_at_price: getOptional(mapped, 'variant_compare_at_price'),
            variant_cost_price: getOptional(mapped, 'variant_cost_price'),
            variant_weight: getOptional(mapped, 'variant_weight'),
            variant_weight_unit: getOptional(mapped, 'variant_weight_unit'),
            variant_inventory_policy: getOptional(mapped, 'variant_inventory_policy'),
            variant_inventory: getOptional(mapped, 'variant_inventory'),
            variant_media_urls: getOptional(mapped, 'variant_media_urls') || getOptional(mapped, 'variant_media_url'),
          };
        })
        .filter((row) => {
          const checkFields = [
            row.title,
            row.handle,
            row.parent_handle,
            row.category_slugs,
            row.option1_name,
            row.option1_values,
            row.option2_name,
            row.option2_values,
            row.option3_name,
            row.option3_values,
            row.brand,
            row.description,
            row.media_url,
            row.country_codes,
            row.variant_option1_value,
            row.variant_option2_value,
            row.variant_option3_value,
            row.variant_sku,
            row.variant_barcode,
            row.variant_price,
            row.variant_compare_at_price,
            row.variant_cost_price,
            row.variant_weight,
            row.variant_weight_unit,
            row.variant_inventory_policy,
            row.variant_inventory,
            row.variant_media_urls,
          ];

          return checkFields.some((value) => String(value ?? '').trim().length > 0);
        });

      if (parsedRows.length === 0) {
        throw new Error('No importable data rows found in file.');
      }

      setRows(parsedRows);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse CSV file.');
      setRows([]);
    }
  };

  const handleImport = async () => {
    setParseError(null);

    if (!selectedStoreId) {
      setParseError('No accessible store found. Please select a store before importing.');
      return;
    }

    await runImport({
      variables: {
        input: {
          store_id: selectedStoreId,
          rows,
          continue_on_error: true,
        },
      },
    });
  };

  const importResult = data?.bulkImportProducts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border bg-card px-6 py-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Catalog</p>
          <h1 className="text-3xl font-bold tracking-tight">Import Products</h1>
          <p className="text-muted-foreground">Upload CSV, validate required columns, and import directly to database.</p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/products" />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template</CardTitle>
          <CardDescription>Download sample CSV with required and optional columns.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Badge variant="secondary">Required: {REQUIRED_COLUMNS.join(', ')}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Optional: {OPTIONAL_COLUMNS.join(', ')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
          <CardDescription>
            Parent rows are inferred from product fields (title/category/options). Child variant rows are inferred from variant_* fields and linked by handle/parent_handle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="import-store-select">
              Import into store
            </label>
            <select
              id="import-store-select"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={selectedStoreId ?? ''}
              disabled={storesLoading || storeOptions.length === 0}
              onChange={(event) => setSelectedStoreId(event.target.value ? Number(event.target.value) : null)}
            >
              {storeOptions.length === 0 ? <option value="">No accessible stores</option> : null}
              {storeOptions.map((store) => (
                <option key={store.store_id} value={store.store_id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <Input type="file" accept=".csv,text/csv" onChange={handleFileUpload} />
          {fileName && <p className="text-sm text-muted-foreground">Selected file: {fileName}</p>}

          {parseError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {parseError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Parsed rows: {rows.length}</p>
            <Button onClick={handleImport} disabled={loading || rows.length === 0 || !selectedStoreId}>
              <Upload className="mr-2 h-4 w-4" />
              {loading ? 'Importing...' : 'Import to Database'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              Total: {importResult.total_rows} | Success: {importResult.success_count} | Failed: {importResult.failure_count}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importResult.results.map((result) => (
                  <TableRow key={`${result.row_number}-${result.handle || 'na'}`}>
                    <TableCell>{result.row_number}</TableCell>
                    <TableCell>
                      {result.success ? (
                        <Badge>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{result.product_id || '—'}</TableCell>
                    <TableCell>{result.handle || '—'}</TableCell>
                    <TableCell className="max-w-xl text-sm text-muted-foreground">{result.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

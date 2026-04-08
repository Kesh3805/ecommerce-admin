'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { ArrowLeft, Globe2, Loader2, Save } from 'lucide-react';

import {
  GET_AVAILABLE_COUNTRIES,
  GET_MY_STORES,
  SET_STORE_COUNTRIES,
} from '@/graphql/operations';
import { COUNTRY_OPTIONS } from '@/lib/countries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface GetMyStoresResponse {
  myStores: Array<{ store_id: number; name: string }>;
}

interface GetAvailableCountriesResponse {
  availableCountries: string[];
}

interface SetStoreCountriesResponse {
  setStoreCountries: string[];
}

const ALL_COUNTRY_CODES = COUNTRY_OPTIONS.map((country) => country.code);
const COUNTRY_NAME_BY_CODE = new Map(COUNTRY_OPTIONS.map((country) => [country.code, country.name]));

function normalizeCountryCodes(codes: string[]): string[] {
  return [...new Set(codes.map((code) => code.toUpperCase()).filter((code) => /^[A-Z]{2}$/.test(code)))].sort();
}

export default function StoreCountriesPage() {
  const [draftCountryCodes, setDraftCountryCodes] = useState<string[] | null>(null);
  const [savedCountryCodes, setSavedCountryCodes] = useState<string[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data: storesData, loading: storesLoading } = useQuery<GetMyStoresResponse>(GET_MY_STORES);
  const storeId = storesData?.myStores?.[0]?.store_id;
  const storeName = storesData?.myStores?.[0]?.name;

  const { data: countriesData, loading: countriesLoading, refetch } = useQuery<GetAvailableCountriesResponse>(
    GET_AVAILABLE_COUNTRIES,
    {
      variables: { storeId },
      skip: !storeId,
      fetchPolicy: 'network-only',
    },
  );

  const [saveStoreCountries, { loading: saving }] = useMutation<SetStoreCountriesResponse>(SET_STORE_COUNTRIES);

  const fetchedCountryCodes = useMemo(() => {
    const normalized = normalizeCountryCodes(countriesData?.availableCountries ?? []);
    return normalized.length > 0 ? normalized : ALL_COUNTRY_CODES;
  }, [countriesData]);

  const baselineCountryCodes = useMemo(() => {
    if (!savedCountryCodes) {
      return fetchedCountryCodes;
    }

    const savedKey = [...savedCountryCodes].sort().join(',');
    const fetchedKey = [...fetchedCountryCodes].sort().join(',');
    return savedKey === fetchedKey ? fetchedCountryCodes : savedCountryCodes;
  }, [fetchedCountryCodes, savedCountryCodes]);

  const selectedCountryCodes = draftCountryCodes ?? baselineCountryCodes;

  const countryOptions = useMemo(
    () =>
      COUNTRY_OPTIONS.map((country) => ({
        code: country.code,
        name: COUNTRY_NAME_BY_CODE.get(country.code) || country.code,
      })),
    [],
  );

  const hasUnsavedChanges = useMemo(() => {
    const current = [...selectedCountryCodes].sort().join(',');
    const initial = [...baselineCountryCodes].sort().join(',');
    return current !== initial;
  }, [baselineCountryCodes, selectedCountryCodes]);

  const toggleCountry = (countryCode: string) => {
    setMessage(null);
    setDraftCountryCodes((currentDraft) => {
      const base = currentDraft ?? selectedCountryCodes;

      if (base.includes(countryCode)) {
        return base.filter((code) => code !== countryCode);
      }

      return [...base, countryCode].sort();
    });
  };

  const handleSave = async () => {
    if (!storeId) {
      return;
    }

    if (selectedCountryCodes.length === 0) {
      setMessage('Select at least one country to keep storefront country switching enabled.');
      return;
    }

    setMessage(null);

    try {
      const response = await saveStoreCountries({
        variables: {
          input: {
            store_id: storeId,
            country_codes: selectedCountryCodes,
          },
        },
      });

      const normalized = normalizeCountryCodes(response.data?.setStoreCountries ?? selectedCountryCodes);
      setSavedCountryCodes(normalized);
      setDraftCountryCodes(null);
      setMessage('Store countries saved successfully.');
      await refetch();
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Failed to save store countries.';
      setMessage(errMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-linear-to-r from-primary/10 via-secondary/30 to-muted px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Store Countries</h1>
            <p className="text-sm text-muted-foreground">
              Choose which countries are available for {storeName || 'your store'}. Product editors and storefront selectors use this list.
            </p>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/locations" />}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Locations
          </Button>
        </div>
      </div>

      {!storesLoading && !storeId && (
        <p className="text-sm text-destructive">No accessible store found for your account.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-4 w-4" />
            Country Configuration
          </CardTitle>
          <CardDescription>
            Only countries selected here appear in product country availability and storefront country selection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{selectedCountryCodes.length} selected</Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraftCountryCodes([...ALL_COUNTRY_CODES])}
              disabled={countriesLoading || !storeId}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraftCountryCodes([])}
              disabled={countriesLoading || !storeId}
            >
              Clear all
            </Button>
          </div>

          {countriesLoading ? (
            <p className="text-sm text-muted-foreground">Loading countries...</p>
          ) : (
            <div className="grid max-h-72 grid-cols-1 gap-2 overflow-auto rounded-md border p-3 text-sm sm:grid-cols-2">
              {countryOptions.map((country) => {
                const checked = selectedCountryCodes.includes(country.code);

                return (
                  <label key={country.code} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCountry(country.code)}
                      className="h-4 w-4"
                    />
                    <span>{country.code}</span>
                    <span className="text-muted-foreground">{country.name}</span>
                  </label>
                );
              })}
            </div>
          )}

          {message && (
            <p className={`text-sm ${message.includes('successfully') ? 'text-emerald-600' : 'text-destructive'}`}>
              {message}
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!storeId || saving || !hasUnsavedChanges}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!saving && <Save className="mr-2 h-4 w-4" />}
              Save Countries
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

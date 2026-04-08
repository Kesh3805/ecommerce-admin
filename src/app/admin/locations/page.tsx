'use client';

import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

import { GET_LOCATIONS, GET_MY_STORES } from '@/graphql/operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface GetMyStoresResponse {
  myStores: Array<{ store_id: number; name: string }>;
}

interface Location {
  location_id: number;
  name: string;
  is_active: boolean;
}

interface GetLocationsResponse {
  locations: Location[];
}

export default function LocationsPage() {
  const { data: storesData, loading: storesLoading } = useQuery<GetMyStoresResponse>(GET_MY_STORES);
  const storeId = storesData?.myStores?.[0]?.store_id;
  const storeName = storesData?.myStores?.[0]?.name;

  const { data: locationsData, loading: locationsLoading } = useQuery<GetLocationsResponse>(GET_LOCATIONS, {
    variables: { storeId },
    skip: !storeId,
  });

  const locations = locationsData?.locations ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-linear-to-r from-primary/10 via-secondary/30 to-muted px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
            <p className="text-sm text-muted-foreground">
              Inventory locations for {storeName || 'your store'}. Product and storefront country lists are managed separately.
            </p>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link href="/admin/locations/countries" />}>
            Manage Countries
          </Button>
        </div>
      </div>

      {!storesLoading && !storeId && <p className="text-sm text-destructive">No accessible store found for your account.</p>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Store Inventory Locations
          </CardTitle>
          <CardDescription>Current location setup is preserved for inventory operations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {locationsLoading ? (
            <p className="text-sm text-muted-foreground">Loading locations...</p>
          ) : locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No locations configured for this store.</p>
          ) : (
            <div className="space-y-2">
              {locations.map((location) => (
                <div key={location.location_id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{location.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {location.location_id}</p>
                  </div>
                  <Badge variant={location.is_active ? 'default' : 'outline'}>
                    {location.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

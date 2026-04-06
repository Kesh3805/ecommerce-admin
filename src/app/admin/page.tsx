'use client';

import { useQuery } from '@apollo/client/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { GET_PRODUCTS } from '@/graphql/operations';

interface GetProductsResponse {
  products: {
    total: number;
  };
}

export default function AdminDashboard() {
  const storeId = Number(process.env.NEXT_PUBLIC_STORE_ID || 1);
  const { data } = useQuery<GetProductsResponse>(GET_PRODUCTS, {
    variables: { filter: { store_id: storeId }, pagination: { page: 1, limit: 1 } },
  });

  const totalProducts = data?.products?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-linear-to-r from-primary/10 via-secondary/30 to-muted px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overview</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome to your ecommerce admin dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-card/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <div className="rounded-md bg-primary/10 p-1.5">
              <Package className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products in catalog
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <div className="rounded-md bg-secondary p-1.5">
              <ShoppingCart className="h-4 w-4 text-secondary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Orders pending fulfillment
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <div className="rounded-md bg-secondary p-1.5">
              <Users className="h-4 w-4 text-secondary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Registered customers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/90">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <div className="rounded-md bg-primary/10 p-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹0</div>
            <p className="text-xs text-muted-foreground">
              Total revenue this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/90">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No orders yet</p>
          </CardContent>
        </Card>

        <Card className="bg-card/90">
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
            <CardDescription>Products running low on inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No low stock items</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

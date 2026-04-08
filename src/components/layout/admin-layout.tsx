'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Package,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Settings,
  Boxes,
  Tags,
  Tag,
  MapPin,
  LogOut,
  Sparkles,
  Library,
  FileUp,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { clearAuthToken, isAuthenticated } from '@/lib/auth';

const navItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Products',
    href: '/admin/products',
    icon: Package,
  },
  {
    title: 'Product Import',
    href: '/admin/products/import',
    icon: FileUp,
  },
  {
    title: 'Categories',
    href: '/admin/categories',
    icon: Tags,
  },
  {
    title: 'Brands',
    href: '/admin/brands',
    icon: Tag,
  },
  {
    title: 'Collections',
    href: '/admin/collections',
    icon: Library,
  },
  {
    title: 'Inventory',
    href: '/admin/inventory',
    icon: Boxes,
  },
  {
    title: 'Locations',
    href: '/admin/locations',
    icon: MapPin,
  },
  {
    title: 'Orders',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    title: 'Customers',
    href: '/admin/customers',
    icon: Users,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/admin" className="flex items-center gap-3 rounded-lg border bg-card p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Admin Console</p>
            <p className="text-xs text-muted-foreground">Ecommerce Suite</p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">Ecommerce Admin v1.0</div>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => {
              clearAuthToken();
              router.push('/login');
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const authenticated = isAuthenticated();

  useEffect(() => {
    if (!authenticated) {
      router.replace('/login');
    }
  }, [authenticated, router]);

  if (!authenticated) {
    return <div className="p-6 text-sm text-muted-foreground">Checking session...</div>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="hidden items-center gap-2 rounded-full border bg-muted/60 px-3 py-1 text-xs text-muted-foreground md:flex">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Live Admin Workspace</span>
          </div>
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-auto bg-muted/20 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

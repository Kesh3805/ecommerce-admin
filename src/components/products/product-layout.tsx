import { ReactNode } from 'react';

interface ProductHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function ProductHeader({ title, description, actions }: ProductHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}

interface ProductLayoutProps {
  main: ReactNode;
  sidebar: ReactNode;
}

export function ProductEditorLayout({ main, sidebar }: ProductLayoutProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <ProductMain>{main}</ProductMain>
      <ProductSidebar>{sidebar}</ProductSidebar>
    </div>
  );
}

export function ProductMain({ children }: { children: ReactNode }) {
  return <div className="space-y-6 lg:col-span-2">{children}</div>;
}

export function ProductSidebar({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

'use client';

import { ApolloProvider } from '@/providers/apollo-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ApolloProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </ApolloProvider>
  );
}

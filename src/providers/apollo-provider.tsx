'use client';

import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client/core';
import { ReactNode, useMemo } from 'react';
import { setContext } from '@apollo/client/link/context';

// Import React-specific provider
import { ApolloProvider as ReactApolloProvider } from '@apollo/client/react';

function createApolloClient() {
  const authLink = setContext((_, previousContext) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null;

    return {
      ...previousContext,
      headers: {
        ...previousContext.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4100/graphql',
    credentials: 'include',
  });

  return new ApolloClient({
    link: ApolloLink.from([authLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            products: {
              keyArgs: ['filter'],
              merge(existing, incoming, { args }) {
                if (!args?.filter?.cursor) {
                  return incoming;
                }
                return {
                  ...incoming,
                  items: [...(existing?.items || []), ...incoming.items],
                };
              },
            },
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
      },
    },
  });
}

interface ApolloProviderProps {
  children: ReactNode;
}

export function ApolloProvider({ children }: ApolloProviderProps) {
  const client = useMemo(() => createApolloClient(), []);

  return <ReactApolloProvider client={client}>{children}</ReactApolloProvider>;
}

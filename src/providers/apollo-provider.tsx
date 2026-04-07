'use client';

import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client/core';
import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ReactNode, useMemo } from 'react';
import { setContext } from '@apollo/client/link/context';

// Import React-specific provider
import { ApolloProvider as ReactApolloProvider } from '@apollo/client/react';
import { getAuthToken, clearAuthToken } from '@/lib/auth';

function createApolloClient() {
  const authLink = setContext((_, previousContext) => {
    const token = getAuthToken();

    return {
      ...previousContext,
      headers: {
        ...previousContext.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  // Error link to handle authentication errors
  const errorLink = new ErrorLink(({ error }) => {
    if (CombinedGraphQLErrors.is(error)) {
      for (const err of error.errors) {
        // Check for authentication errors
        if (
          err.extensions?.code === 'UNAUTHENTICATED' ||
          err.extensions?.code === 'FORBIDDEN' ||
          err.message?.toLowerCase().includes('unauthorized') ||
          err.message?.toLowerCase().includes('authentication required') ||
          err.message?.toLowerCase().includes('token expired') ||
          err.message?.toLowerCase().includes('invalid token')
        ) {
          // Clear the invalid token and redirect to login
          clearAuthToken();
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          break;
        }
      }
    } else {
      // Handle network errors (e.g., 401 from server)
      const networkError = error as Error & { statusCode?: number };
      if (networkError.statusCode === 401 || networkError.statusCode === 403) {
        clearAuthToken();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
  });

  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4100/graphql',
    credentials: 'include',
  });

  return new ApolloClient({
    link: ApolloLink.from([errorLink, authLink, httpLink]),
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

import { GraphQLError } from 'graphql';
import { ComponentType } from 'react';
import { ClientOptions, Exchange, Client } from 'urql';

export interface PartialNextContext {
  res?: any;
  AppTree?: NextComponentType<PartialNextContext>;
  Component?: NextComponentType<PartialNextContext>;
  ctx?: PartialNextContext;
  [key: string]: any;
}

export type NextComponentType<
  C extends PartialNextContext = PartialNextContext,
  IP = {},
  P = {}
> = ComponentType<P & WithUrqlProps> & {
  getInitialProps?(context: C): IP | Promise<IP>;
};

export type NextUrqlClientConfig = (
  ssrExchange: SSRExchange,
  ctx?: PartialNextContext
) => ClientOptions;

export interface NextUrqlContext extends PartialNextContext {
  urqlClient: Client;
}

export type NextUrqlPageContext = NextUrqlContext;
export type NextUrqlAppContext = NextUrqlContext;

export interface WithUrqlState {
  urqlState?: SSRData;
}

export interface WithUrqlClient {
  urqlClient?: Client;
}

export interface WithUrqlProps extends WithUrqlClient, WithUrqlState {
  resetUrqlClient?: () => void;
  [key: string]: any;
}

export interface SerializedResult {
  data?: any;
  error?: {
    graphQLErrors: Array<Partial<GraphQLError> | string>;
    networkError?: string;
  };
}

export interface SSRData {
  [key: string]: SerializedResult;
}

export interface SSRExchange extends Exchange {
  /** Rehydrates cached data */
  restoreData(data: SSRData): void;
  /** Extracts cached data */
  extractData(): SSRData;
}

export interface WithUrqlClientOptions {
  ssr?: boolean;
  neverSuspend?: boolean;
}

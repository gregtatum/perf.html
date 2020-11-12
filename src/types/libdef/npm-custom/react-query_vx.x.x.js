// Adapted from: https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/react-query/index.d.ts
// @flow
import * as React from 'react';

declare module 'react-query' {
  // overloaded useQuery function
  declare function useQuery<
    TResult,
    TKey: AnyQueryKey,
    TVariables: Array
  >(query: {
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    variables?: TVariables,
    queryFn: QueryFunctionWithVariables<TResult, TKey, TVariables>,
    config?: QueryOptions<TResult>,
  }): QueryResult<TResult>;

  declare function useQuery<
    TResult,
    TSingleKey: string,
    TVariables: AnyVariables
  >(query: {
    queryKey:
      | TSingleKey
      | false
      | null
      | undefined
      | (() => TSingleKey | false | null | undefined),
    variables?: TVariables,
    queryFn: QueryFunctionWithVariables<TResult, [TSingleKey], TVariables>,
    config?: QueryOptions<TResult>,
  }): QueryResult<TResult>;

  declare function useQuery<TResult, TKey: AnyQueryKey>(
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    queryFn: QueryFunction<TResult, TKey>,
    config?: QueryOptions<TResult>
  ): QueryResult<TResult>;

  declare function useQuery<TResult, TSingleKey: string>(
    queryKey:
      | TSingleKey
      | false
      | null
      | undefined
      | (() => TSingleKey | false | null | undefined),
    queryFn: QueryFunction<TResult, [TSingleKey]>,
    config?: QueryOptions<TResult>
  ): QueryResult<TResult>;

  declare function useQuery<
    TResult,
    TKey: AnyQueryKey,
    TVariables: AnyVariables
  >(
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    variables: TVariables,
    queryFn: QueryFunctionWithVariables<TResult, TKey, TVariables>,
    config?: QueryOptions<TResult>
  ): QueryResult<TResult>;

  declare function useQuery<TResult, TKey: string, TVariables: AnyVariables>(
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    variables: TVariables,
    queryFn: QueryFunctionWithVariables<TResult, [TKey], TVariables>,
    config?: QueryOptions<TResult>
  ): QueryResult<TResult>;

  // usePaginatedQuery
  declare function usePaginatedQuery<
    TResult,
    TKey: AnyQueryKey,
    TVariables: AnyVariables
  >(query: {
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    variables?: TVariables,
    queryFn: QueryFunctionWithVariables<TResult, TKey, TVariables>,
    config?: QueryOptions<TResult>,
  }): PaginatedQueryResult<TResult>;

  declare function usePaginatedQuery<
    TResult,
    TSingleKey: string,
    TVariables: AnyVariables
  >(query: {
    queryKey:
      | TSingleKey
      | false
      | null
      | undefined
      | (() => TSingleKey | false | null | undefined),
    variables?: TVariables,
    queryFn: QueryFunctionWithVariables<TResult, [TSingleKey], TVariables>,
    config?: QueryOptions<TResult>,
  }): PaginatedQueryResult<TResult>;

  declare function usePaginatedQuery<TResult, TKey: AnyQueryKey>(
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    queryFn: QueryFunction<TResult, TKey>,
    config?: QueryOptions<TResult>
  ): PaginatedQueryResult<TResult>;

  declare function usePaginatedQuery<TResult, TKey: string>(
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    queryFn: QueryFunction<TResult, [TKey]>,
    config?: QueryOptions<TResult>
  ): PaginatedQueryResult<TResult>;

  declare function usePaginatedQuery<
    TResult,
    TKey: AnyQueryKey,
    TVariables: AnyVariables
  >(
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    variables: TVariables,
    queryFn: QueryFunctionWithVariables<TResult, TKey, TVariables>,
    config?: QueryOptions<TResult>
  ): PaginatedQueryResult<TResult>;

  declare function usePaginatedQuery<
    TResult,
    TKey: string,
    TVariables: AnyVariables
  >(
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    variables: TVariables,
    queryFn: QueryFunctionWithVariables<TResult, [TKey], TVariables>,
    config?: QueryOptions<TResult>
  ): PaginatedQueryResult<TResult>;

  // useInfiniteQuery
  declare function useInfiniteQuery<
    TResult,
    TKey: AnyQueryKey,
    TMoreVariable,
    TVariables: AnyVariables
  >(query: {
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    variables?: TVariables,
    queryFn: InfiniteQueryFunctionWithVariables<
      TResult,
      TKey,
      TVariables,
      TMoreVariable
    >,
    config?: InfiniteQueryOptions<TResult, TMoreVariable>,
  }): InfiniteQueryResult<TResult, TMoreVariable>;

  declare function useInfiniteQuery<
    TResult,
    TSingleKey: string,
    TMoreVariable,
    TVariables: AnyVariables
  >(query: {
    queryKey:
      | TSingleKey
      | false
      | null
      | undefined
      | (() => TSingleKey | false | null | undefined),
    variables?: TVariables,
    queryFn: InfiniteQueryFunctionWithVariables<
      TResult,
      [TSingleKey],
      TVariables,
      TMoreVariable
    >,
    config?: InfiniteQueryOptions<TResult, TMoreVariable>,
  }): InfiniteQueryResult<TResult, TMoreVariable>;

  declare function useInfiniteQuery<TResult, TKey: AnyQueryKey, TMoreVariable>(
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    queryFn: InfiniteQueryFunction<TResult, TKey, TMoreVariable>,
    config?: InfiniteQueryOptions<TResult, TMoreVariable>
  ): InfiniteQueryResult<TResult, TMoreVariable>;

  declare function useInfiniteQuery<TResult, TKey: string, TMoreVariable>(
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    queryFn: InfiniteQueryFunction<TResult, [TKey], TMoreVariable>,
    config?: InfiniteQueryOptions<TResult, TMoreVariable>
  ): InfiniteQueryResult<TResult, TMoreVariable>;

  declare function useInfiniteQuery<
    TResult,
    TKey: AnyQueryKey,
    TVariables: AnyVariables,
    TMoreVariable
  >(
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    variables: TVariables,
    queryFn: InfiniteQueryFunctionWithVariables<
      TResult,
      TKey,
      TVariables,
      TMoreVariable
    >,
    config?: InfiniteQueryOptions<TResult, TMoreVariable>
  ): InfiniteQueryResult<TResult, TMoreVariable>;

  declare function useInfiniteQuery<
    TResult,
    TKey: string,
    TVariables: AnyVariables,
    TMoreVariable
  >(
    queryKey:
      | TKey
      | false
      | null
      | undefined
      | (() => TKey | false | null | undefined),
    variables: TVariables,
    queryFn: InfiniteQueryFunctionWithVariables<
      TResult,
      [TKey],
      TVariables,
      TMoreVariable
    >,
    config?: InfiniteQueryOptions<TResult, TMoreVariable>
  ): InfiniteQueryResult<TResult, TMoreVariable>;

  declare type QueryKeyPart =
    | string
    | object
    | boolean
    | number
    | null
    | QueryKeyPart[]
    | null
    | undefined;

  declare type AnyVariables = Array<unknown>;
  declare type AnyQueryKey = Array<unknown>;
  // Typescript
  // declare type AnyQueryKey = [string, ...QueryKeyPart[]]; // this forces the key to be inferred as a tuple
  // declare type AnyVariables = [] |  [any, ...any[]]; // this forces the variables to be inferred as a tuple

  declare type QueryFunction<TResult, TKey: AnyQueryKey> = (
    ...key: TKey
  ) => Promise<TResult>;
  declare type QueryFunctionWithVariables<
    TResult,
    TKey: AnyQueryKey,
    TVariables: AnyVariables
  > = (
    ...key: Array<unknown> //_.List.Concat<TKey, TVariables>
  ) => Promise<TResult>;

  declare type InfiniteQueryFunction<
    TResult,
    TKey: AnyQueryKey,
    TMoreVariable
  > = (
    ...keysAndMore: Array<unknown> // _.List.Append<TKey, TMoreVariable> | TKey
  ) => Promise<TResult>;
  declare type InfiniteQueryFunctionWithVariables<
    TResult,
    TKey: AnyQueryKey,
    TVariables: AnyVariables,
    TMoreVariable
  > = (
    ...keysAndVariablesAndMore: unknown
    // | _.List.Append<_.List.Concat<TKey, TVariables>, TMoreVariable>
    // | _.List.Concat<TKey, TVariables>
  ) => Promise<TResult>;

  declare class BaseQueryOptions {
    /**
     * Set this to `true` to disable automatic refetching when the query mounts or changes query keys.
     * To refetch the query, use the `refetch` method returned from the `useQuery` instance.
     */
    manual?: boolean;
    /**
     * If `false`, failed queries will not retry by default.
     * If `true`, failed queries will retry infinitely.
     * If set to an integer number, e.g. 3, failed queries will retry until the failed query count meets that number.
     */
    retry?: boolean | number;
    retryDelay?: (retryAttempt: number) => number;
    staleTime?: number;
    cacheTime?: number;
    refetchInterval?: false | number;
    refetchIntervalInBackground?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnMount?: boolean;
    onError?: (err: unknown) => void;
    suspense?: boolean;
  }

  declare class QueryOptions<TResult> extends BaseQueryOptions {
    onSuccess?: (data: TResult) => void;
    onSettled?: (data: TResult | undefined, error: unknown | null) => void;
    initialData?: TResult | (() => TResult | undefined);
  }

  declare class InfiniteQueryOptions<
    TResult,
    TMoreVariable
  > extends QueryOptions<TResult[]> {
    getFetchMore: (
      lastPage: TResult,
      allPages: TResult[]
    ) => TMoreVariable | false;
  }

  declare class QueryResultBase<TResult> {
    status: 'loading' | 'error' | 'success';
    error: null | unknown;
    isFetching: boolean;
    failureCount: number;
    refetch: (config?: {
      force?: boolean,
      throwOnError?: boolean,
    }) => Promise<TResult>;
  }

  declare class QueryLoadingResult<TResult> extends QueryResultBase<TResult> {
    status: 'loading';
    data: TResult | undefined; // even when error, data can have stale data
    error: unknown | null; // it still can be error
  }

  declare class QueryErrorResult<TResult> extends QueryResultBase<TResult> {
    status: 'error';
    data: TResult | undefined; // even when error, data can have stale data
    error: unknown;
  }

  declare class QuerySuccessResult<TResult> extends QueryResultBase<TResult> {
    status: 'success';
    data: TResult;
    error: null;
  }

  declare type QueryResult<TResult> =
    | QueryLoadingResult<TResult>
    | QueryErrorResult<TResult>
    | QuerySuccessResult<TResult>;

  declare class PaginatedQueryLoadingResult<
    TResult
  > extends QueryResultBase<TResult> {
    status: 'loading';
    resolvedData: undefined | TResult; // even when error, data can have stale data
    latestData: undefined | TResult; // even when error, data can have stale data
    error: unknown | null; // it still can be error
  }

  declare class PaginatedQueryErrorResult<
    TResult
  > extends QueryResultBase<TResult> {
    status: 'error';
    resolvedData: undefined | TResult; // even when error, data can have stale data
    latestData: undefined | TResult; // even when error, data can have stale data
    error: unknown;
  }

  declare class PaginatedQuerySuccessResult<
    TResult
  > extends QueryResultBase<TResult> {
    status: 'success';
    resolvedData: TResult;
    latestData: TResult;
    error: null;
  }

  declare type PaginatedQueryResult<TResult> =
    | PaginatedQueryLoadingResult<TResult>
    | PaginatedQueryErrorResult<TResult>
    | PaginatedQuerySuccessResult<TResult>;

  declare class InfiniteQueryResult<
    TResult,
    TMoreVariable
  > extends QueryResultBase<TResult[]> {
    data: TResult[];
    isFetchingMore: boolean;
    canFetchMore: boolean | undefined;
    fetchMore: (
      moreVariable?: TMoreVariable | false
    ) => Promise<TResult[]> | undefined;
  }

  declare function useMutation<TResults, TVariables>(
    mutationFn: MutationFunction<TResults, TVariables>,
    mutationOptions?: MutationOptions<TResults, TVariables>
  ): [MutateFunction<TResults, TVariables>, MutationResult<TResults>];

  declare type MutationFunction<TResults, TVariables> = (
    variables: TVariables
  ) => Promise<TResults>;

  declare class MutateOptions<TResult, TVariables> {
    onSuccess?: (data: TResult, variables: TVariables) => Promise<void> | void;
    onError?: (
      error: unknown,
      variables: TVariables,
      snapshotValue: unknown
    ) => Promise<void> | void;
    onSettled?: (
      data: undefined | TResult,
      error: unknown | null,
      variables: TVariables,
      snapshotValue?: unknown
    ) => Promise<void> | void;
    throwOnError?: boolean;
  }

  declare class MutationOptions<TResult, TVariables> extends MutateOptions<
    TResult,
    TVariables
  > {
    onMutate?: (variables: TVariables) => Promise<unknown> | unknown;
    useErrorBoundary?: boolean;
  }

  declare type MutateFunction<TResult, TVariables> = unknown;
  // undefined: TVariables
  //   ? (variables?: TVariables, options?: MutateOptions<TResult, TVariables>) => Promise<TResult>
  //   : (variables: TVariables, options?: MutateOptions<TResult, TVariables>) => Promise<TResult>;

  declare class MutationResultBase<TResult> {
    status: 'idle' | 'loading' | 'error' | 'success';
    data: undefined | TResult;
    error: null | unknown;
    promise: Promise<TResult>;
    reset: () => void;
  }

  declare class IdleMutationResult<
    TResult
  > extends MutationResultBase<TResult> {
    status: 'idle';
    data: undefined;
    error: null;
  }

  declare class LoadingMutationResult<
    TResult
  > extends MutationResultBase<TResult> {
    status: 'loading';
    data: undefined;
    error: undefined;
  }

  declare class ErrorMutationResult<
    TResult
  > extends MutationResultBase<TResult> {
    status: 'error';
    data: undefined;
    error: unknown;
  }

  declare class SuccessMutationResult<
    TResult
  > extends MutationResultBase<TResult> {
    status: 'success';
    data: TResult;
    error: undefined;
  }

  declare type MutationResult<TResult> =
    | IdleMutationResult<TResult>
    | LoadingMutationResult<TResult>
    | ErrorMutationResult<TResult>
    | SuccessMutationResult<TResult>;

  declare class CachedQuery {
    queryKey: AnyQueryKey;
    queryVariables: AnyVariables;
    queryFn: (...args: any[]) => unknown;
    config: QueryOptions<unknown>;
    state: unknown;
    setData(
      dataOrUpdater: unknown | ((oldData: unknown | undefined) => unknown)
    ): void;
  }

  declare class QueryCache {
    prefetchQuery<TResult, TKey: AnyQueryKey>(
      queryKey:
        | TKey
        | false
        | null
        | undefined
        | (() => TKey | false | null | undefined),
      queryFn: QueryFunction<TResult, TKey>,
      config?: QueryOptions<TResult>
    ): Promise<TResult>;

    prefetchQuery<TResult, TKey: string>(
      queryKey:
        | TKey
        | false
        | null
        | undefined
        | (() => TKey | false | null | undefined),
      queryFn: QueryFunction<TResult, [TKey]>,
      config?: QueryOptions<TResult>
    ): Promise<TResult>;

    prefetchQuery<TResult, TKey: AnyQueryKey, TVariables: AnyVariables>(
      queryKey:
        | TKey
        | false
        | null
        | undefined
        | (() => TKey | false | null | undefined),
      variables: TVariables,
      queryFn: QueryFunctionWithVariables<TResult, TKey, TVariables>,
      config?: QueryOptions<TResult>
    ): Promise<TResult>;

    prefetchQuery<TResult, TKey: string, TVariables: AnyVariables>(
      queryKey:
        | TKey
        | false
        | null
        | undefined
        | (() => TKey | false | null | undefined),
      variables: TVariables,
      queryFn: QueryFunctionWithVariables<TResult, [TKey], TVariables>,
      config?: QueryOptions<TResult>
    ): Promise<TResult>;

    prefetchQuery<TResult, TKey: AnyQueryKey, TVariables: AnyVariables>(query: {
      queryKey:
        | TKey
        | false
        | null
        | undefined
        | (() => TKey | false | null | undefined),
      variables?: TVariables,
      queryFn: QueryFunctionWithVariables<TResult, TKey, TVariables>,
      config?: QueryOptions<TResult>,
    }): Promise<TResult>;

    getQueryData(key: AnyQueryKey | string): unknown | undefined;
    setQueryData(
      key: AnyQueryKey | string,
      dataOrUpdater: unknown | ((oldData: unknown | undefined) => unknown)
    ): void;
    refetchQueries(
      queryKeyOrPredicateFn:
        | AnyQueryKey
        | string
        | ((query: CachedQuery) => boolean),
      options?: { exact?: boolean, throwOnError?: boolean, force?: boolean }
    ): Promise<void>;
    removeQueries(
      queryKeyOrPredicateFn:
        | AnyQueryKey
        | string
        | ((query: CachedQuery) => boolean),
      options?: { exact?: boolean }
    ): Promise<void>;
    getQuery(queryKey: AnyQueryKey): CachedQuery | undefined;
    getQueries(queryKey: AnyQueryKey): CachedQuery[];
    isFetching: number;
    subscribe(callback: (queryCache: QueryCache) => void): () => void;
    clear(): CachedQuery[];
  }

  declare var queryCache: QueryCache;

  /**
   * A hook that returns the number of the quiries that your application is loading or fetching in the background
   * (useful for app-wide loading indicators).
   * @returns the number of the quiries that your application is currently loading or fetching in the background.
   */
  declare function useIsFetching(): number;

  declare var ReactQueryConfigProvider: React.ComponentType<{
    config?: ReactQueryProviderConfig,
  }>;

  declare class ReactQueryProviderConfig extends BaseQueryOptions {
    /** Defaults to the value of `suspense` if not defined otherwise */
    useErrorBoundary?: boolean;
    throwOnError?: boolean;
    refetchAllOnWindowFocus?: boolean;
    queryKeySerializerFn?: (
      queryKey:
        | QueryKeyPart[]
        | string
        | false
        | undefined
        | (() => QueryKeyPart[] | string | false | undefined)
    ) => [string, QueryKeyPart[]] | [];

    onMutate?: (variables: unknown) => Promise<unknown> | unknown;
    onSuccess?: (data: unknown, variables?: unknown) => void;
    onError?: (err: unknown, snapshotValue?: unknown) => void;
    onSettled?: (
      data: unknown | undefined,
      error: unknown | null,
      snapshotValue?: unknown
    ) => void;
  }

  declare type ConsoleFunction = (...args: any[]) => void;
  declare class ConsoleObject {
    log: ConsoleFunction;
    warn: ConsoleFunction;
    error: ConsoleFunction;
  }

  declare function setConsole(consoleObject: ConsoleObject): void;
}

import { Timestamp } from 'firebase/firestore';

export interface Auditable {
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly createdBy?: string;
  readonly updatedBy?: string;
}

export interface SoftDeletable {
  readonly isDeleted: boolean;
  readonly deletedAt?: Timestamp;
  readonly deletedBy?: string;
}

export interface PageRequest {
  readonly pageSize: number;
  readonly cursor?: string;
}

export interface PageResult<T> {
  readonly items: T[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

export interface AsyncState<T> {
  readonly loading: boolean;
  readonly data: T | null;
  readonly error: string | null;
}

export function idleState<T>(): AsyncState<T> {
  return { loading: false, data: null, error: null };
}

export function loadingState<T>(data: T | null = null): AsyncState<T> {
  return { loading: true, data, error: null };
}

export function successState<T>(data: T): AsyncState<T> {
  return { loading: false, data, error: null };
}

export function errorState<T>(error: string, data: T | null = null): AsyncState<T> {
  return { loading: false, data, error };
}

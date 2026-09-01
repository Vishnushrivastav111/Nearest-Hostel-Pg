import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  Timestamp,
  WithFieldValue,
} from 'firebase/firestore';

export function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return omitUndefinedDeep(value) as T;
}

function omitUndefinedDeep(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (value instanceof Timestamp) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => omitUndefinedDeep(item))
      .filter((item) => item !== undefined);
  }
  if (isFirestoreSentinel(value)) {
    return value;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested === undefined) {
      continue;
    }
    const cleaned = omitUndefinedDeep(nested);
    if (cleaned !== undefined) {
      output[key] = cleaned;
    }
  }
  return output;
}

function isFirestoreSentinel(value: object): boolean {
  return '_methodName' in value || value.constructor?.name?.includes('FieldValue') === true;
}

export function createConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(modelObject: WithFieldValue<T>): WithFieldValue<DocumentData> {
      const { id: _id, ...data } = modelObject as T & { id: string };
      return omitUndefined(data as Record<string, unknown>);
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      return { id: snapshot.id, ...snapshot.data() } as T;
    },
  };
}

export function toDate(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  return value.toDate();
}

export function encodeCursor(id: string): string {
  return encodeURIComponent(id);
}

export function decodeCursor(cursor: string): string {
  return decodeURIComponent(cursor);
}

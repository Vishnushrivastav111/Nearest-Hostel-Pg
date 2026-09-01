import { Timestamp } from 'firebase/firestore';

export function isTimestamp(value: unknown): value is Timestamp {
  return value instanceof Timestamp;
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

export function toTimestamp(value: Timestamp | Date): Timestamp {
  return value instanceof Timestamp ? value : Timestamp.fromDate(value);
}

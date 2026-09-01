import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  Query,
  QueryConstraint,
  Timestamp,
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { PageResult } from '../models/common.model';
import { decodeCursor, encodeCursor, omitUndefined } from '../utils/firestore.util';
import { FirebaseConfigService } from './firebase-config.service';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private readonly firestore = inject(Firestore);
  private readonly config = inject(FirebaseConfigService);

  collectionRef(name: string): CollectionReference<DocumentData> {
    this.config.assertConfigured();
    return collection(this.firestore, name);
  }

  docRef(name: string, id: string): DocumentReference<DocumentData> {
    return doc(this.collectionRef(name), id);
  }

  newDocRef(name: string): DocumentReference<DocumentData> {
    return doc(this.collectionRef(name));
  }

  async getById<T extends { id: string }>(name: string, id: string): Promise<T | null> {
    const snapshot = await getDoc(this.docRef(name, id));
    return this.mapDoc<T>(snapshot.id, snapshot.data(), snapshot.exists());
  }

  watchById<T extends { id: string }>(name: string, id: string): Observable<T | null> {
    return new Observable<T | null>((subscriber) => {
      const unsubscribe: Unsubscribe = onSnapshot(
        this.docRef(name, id),
        (snapshot) => subscriber.next(this.mapDoc<T>(snapshot.id, snapshot.data(), snapshot.exists())),
        (error) => subscriber.error(error),
      );
      return () => unsubscribe();
    });
  }

  watchQuery<T extends { id: string }>(
    name: string,
    ...constraints: QueryConstraint[]
  ): Observable<T[]> {
    const q = query(this.collectionRef(name), ...constraints);
    return new Observable<T[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) =>
          subscriber.next(
            snapshot.docs.map((item) => this.mapDoc<T>(item.id, item.data(), true) as T),
          ),
        (error) => subscriber.error(error),
      );
      return () => unsubscribe();
    });
  }

  async create<T extends Record<string, unknown>>(
    name: string,
    data: T,
    id?: string,
  ): Promise<string> {
    const ref = id ? this.docRef(name, id) : this.newDocRef(name);
    await setDoc(ref, omitUndefined(data));
    return ref.id;
  }

  async update(name: string, id: string, data: Record<string, unknown>): Promise<void> {
    await updateDoc(this.docRef(name, id), omitUndefined(data));
  }

  async delete(name: string, id: string): Promise<void> {
    await deleteDoc(this.docRef(name, id));
  }

  async count(name: string, ...constraints: QueryConstraint[]): Promise<number> {
    const snapshot = await getCountFromServer(query(this.collectionRef(name), ...constraints));
    return snapshot.data().count;
  }

  async getDocs<T extends { id: string }>(
    name: string,
    ...constraints: QueryConstraint[]
  ): Promise<T[]> {
    const snapshot = await getDocs(query(this.collectionRef(name), ...constraints));
    return snapshot.docs.map((item) => this.mapDoc<T>(item.id, item.data(), true) as T);
  }

  async getPage<T extends { id: string }>(
    name: string,
    pageSize: number,
    cursor: string | undefined,
    constraints: QueryConstraint[],
  ): Promise<PageResult<T>> {
    const col = this.collectionRef(name);
    let pageQuery: Query<DocumentData> = query(col, ...constraints, limit(pageSize + 1));

    if (cursor) {
      const cursorSnap = await getDoc(this.docRef(name, decodeCursor(cursor)));
      if (cursorSnap.exists()) {
        pageQuery = query(col, ...constraints, startAfter(cursorSnap), limit(pageSize + 1));
      }
    }

    const snapshot = await getDocs(pageQuery);
    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const last = pageDocs[pageDocs.length - 1];

    return {
      items: pageDocs.map((item) => this.mapDoc<T>(item.id, item.data(), true) as T),
      nextCursor: hasMore && last ? encodeCursor(last.id) : null,
      hasMore,
    };
  }

  auditFields(uid?: string): Record<string, unknown> {
    return omitUndefined({
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: uid,
      updatedBy: uid,
    });
  }

  touchFields(uid?: string): Record<string, unknown> {
    return omitUndefined({
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
  }

  now(): Timestamp {
    return Timestamp.now();
  }

  batch() {
    this.config.assertConfigured();
    return writeBatch(this.firestore);
  }

  get native(): Firestore {
    this.config.assertConfigured();
    return this.firestore;
  }

  private mapDoc<T extends { id: string }>(
    id: string,
    data: DocumentData | undefined,
    exists: boolean,
  ): T | null {
    if (!exists || !data) {
      return null;
    }
    return { id, ...data } as T;
  }
}

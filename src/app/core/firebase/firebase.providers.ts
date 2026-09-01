import {
  ENVIRONMENT_INITIALIZER,
  EnvironmentProviders,
  PLATFORM_ID,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideFirebaseApp } from '@angular/fire/app';
import { provideAuth } from '@angular/fire/auth';
import { provideFirestore } from '@angular/fire/firestore';
import { provideFunctions } from '@angular/fire/functions';
import { provideStorage } from '@angular/fire/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  initializeAuth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { environment } from '../../../environments/environment';
import { isFirebaseConfigured } from '../../../environments/environment.types';

let emulatorsConnected = false;

function ensureFirebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(environment.firebase);
}

function maybeConnectEmulators(): void {
  if (emulatorsConnected || !environment.useEmulators) {
    return;
  }

  const host = environment.emulatorHost;
  connectAuthEmulator(getAuth(), `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(getFirestore(), host, 8080);
  connectStorageEmulator(getStorage(), host, 9199);
  connectFunctionsEmulator(getFunctions(undefined, environment.functionsRegion), host, 5001);
  emulatorsConnected = true;
}

function analyticsInitializer(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useFactory: () => {
        const platformId = inject(PLATFORM_ID);
        return () => {
          if (!isPlatformBrowser(platformId) || !isFirebaseConfigured(environment.firebase)) {
            return;
          }
          void isSupported().then((supported) => {
            if (supported) {
              getAnalytics(getApp());
            }
          });
        };
      },
    },
  ]);
}

export function firebaseProviders(): EnvironmentProviders[] {
  return [
    provideFirebaseApp(() => ensureFirebaseApp()),
    provideAuth(() => {
      const platformId = inject(PLATFORM_ID);
      const app = ensureFirebaseApp();
      const persistence = isPlatformBrowser(platformId)
        ? [indexedDBLocalPersistence, browserLocalPersistence]
        : inMemoryPersistence;
      try {
        return initializeAuth(app, { persistence });
      } catch {
        return getAuth(app);
      }
    }),
    provideFirestore(() => {
      const firestore = getFirestore(ensureFirebaseApp());
      maybeConnectEmulators();
      return firestore;
    }),
    provideStorage(() => getStorage(ensureFirebaseApp())),
    provideFunctions(() => getFunctions(ensureFirebaseApp(), environment.functionsRegion)),
    analyticsInitializer(),
  ];
}

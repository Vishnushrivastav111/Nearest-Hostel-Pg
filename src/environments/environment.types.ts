export interface FirebaseClientConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly messagingSenderId: string;
  readonly appId: string;
  readonly measurementId?: string;
}

export interface CloudinaryClientConfig {
  readonly cloudName: string;
  readonly presets: {
    readonly hostels: string;
    readonly rooms: string;
    readonly videos: string;
    readonly amenities: string;
    readonly profiles: string;
  };
}

export interface AppEnvironment {
  readonly production: boolean;
  readonly firebase: FirebaseClientConfig;
  readonly cloudinary: CloudinaryClientConfig;
  readonly functionsRegion: string;
  readonly recaptchaSiteKey: string;
  readonly useEmulators: boolean;
  readonly emulatorHost: string;
}

export const UNCONFIGURED_FIREBASE: FirebaseClientConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

export function isFirebaseConfigured(firebase: FirebaseClientConfig): boolean {
  return (
    firebase.apiKey.length > 0 &&
    firebase.apiKey !== UNCONFIGURED_FIREBASE.apiKey &&
    firebase.projectId.length > 0 &&
    firebase.projectId !== UNCONFIGURED_FIREBASE.projectId &&
    firebase.appId.length > 0 &&
    firebase.appId !== UNCONFIGURED_FIREBASE.appId
  );
}

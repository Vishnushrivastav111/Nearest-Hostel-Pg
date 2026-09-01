export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  HOSTELS: 'hostels',
  ROOMS: 'rooms',
  LEADS: 'leads',
  BOOKINGS: 'bookings',
  COMMISSIONS: 'commissions',
  REVIEWS: 'reviews',
  FACILITIES: 'facilities',
  NOTIFICATIONS: 'notifications',
  SETTINGS: 'settings',
  ADMIN_HOSTEL_CONTACTS: 'adminHostelContacts',
} as const;

export const COLLECTIONS = {
  users: FIRESTORE_COLLECTIONS.USERS,
  hostels: FIRESTORE_COLLECTIONS.HOSTELS,
  rooms: FIRESTORE_COLLECTIONS.ROOMS,
  leads: FIRESTORE_COLLECTIONS.LEADS,
  bookings: FIRESTORE_COLLECTIONS.BOOKINGS,
  commissions: FIRESTORE_COLLECTIONS.COMMISSIONS,
  reviews: FIRESTORE_COLLECTIONS.REVIEWS,
  facilities: FIRESTORE_COLLECTIONS.FACILITIES,
  notifications: FIRESTORE_COLLECTIONS.NOTIFICATIONS,
  settings: FIRESTORE_COLLECTIONS.SETTINGS,
  adminHostelContacts: FIRESTORE_COLLECTIONS.ADMIN_HOSTEL_CONTACTS,
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export const SETTINGS_DOC_IDS = {
  app: 'app',
  public: 'public',
} as const;

export const LEAD_HISTORY_SUBCOLLECTION = 'history';

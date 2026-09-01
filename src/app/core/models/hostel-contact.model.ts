import { Timestamp } from 'firebase/firestore';

export interface AdminHostelContact {
  readonly id: string;
  readonly hostelId: string;
  readonly contactName: string;
  readonly phone: string;
  readonly email?: string;
  readonly notes?: string;
  readonly updatedAt: Timestamp;
  readonly updatedBy: string;
}

export interface AdminHostelContactWriteInput {
  readonly hostelId: string;
  readonly contactName: string;
  readonly phone: string;
  readonly email?: string;
  readonly notes?: string;
}

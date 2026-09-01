import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CLOUDINARY_FOLDERS } from '../../../core/constants/cloudinary';
import { MediaAsset } from '../../../core/models/media.model';
import { Room } from '../../../core/models/room.model';
import { SHARING_TYPES } from '../../../core/models/room.model';
import { HostelService } from '../../../core/services/hostel.service';
import { RoomService } from '../../../core/services/room.service';
import { AppError } from '../../../core/utils/error.util';
import { hydrateMediaList, mediaWriteFields } from '../../../core/utils/cloudinary.util';
import { MediaUploader } from '../../../shared/components/media-uploader/media-uploader';

@Component({
  selector: 'app-admin-rooms-page',
  imports: [ReactiveFormsModule, RouterLink, MediaUploader],
  templateUrl: './admin-rooms-page.html',
  styleUrl: './admin-rooms-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRoomsPage {
  private readonly roomsApi = inject(RoomService);
  private readonly hostels = inject(HostelService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);

  readonly hostelId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly rooms = signal<Room[]>([]);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly saving = signal(false);
  readonly sharingTypes = SHARING_TYPES;
  readonly folders = CLOUDINARY_FOLDERS;

  readonly form = this.fb.nonNullable.group({
    roomName: ['', Validators.required],
    sharingType: ['double', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    totalBeds: [1, [Validators.required, Validators.min(1)]],
    availableBeds: [1, [Validators.required, Validators.min(0)]],
    description: [''],
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.load();
    }
  }

  roomImages(room: Room): MediaAsset[] {
    return hydrateMediaList(room.images, room.imageUrls, 'image', CLOUDINARY_FOLDERS.rooms);
  }

  async load(): Promise<void> {
    try {
      this.rooms.set(await this.roomsApi.listByHostel(this.hostelId));
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not load rooms.');
    }
  }

  async add(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) {
      return;
    }
    const hostel = await this.hostels.getById(this.hostelId);
    if (!hostel) {
      this.error.set('Hostel not found.');
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.roomsApi.createRoom({
        hostelId: this.hostelId,
        hostelStatus: hostel.status,
        roomName: value.roomName,
        sharingType: value.sharingType as Room['sharingType'],
        price: Number(value.price),
        totalBeds: Number(value.totalBeds),
        availableBeds: Number(value.availableBeds),
        facilities: [],
        imageUrls: [],
        images: [],
        description: value.description || undefined,
        isAvailable: Number(value.availableBeds) > 0,
        isActive: true,
      });
      this.form.reset({
        sharingType: 'double',
        price: 0,
        totalBeds: 1,
        availableBeds: 1,
        roomName: '',
        description: '',
      });
      this.notice.set('Room added. Upload photos below.');
      await this.load();
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not add room.');
    } finally {
      this.saving.set(false);
    }
  }

  async deactivate(id: string): Promise<void> {
    await this.roomsApi.deactivateRoom(id);
    await this.load();
  }

  async saveRoomImages(room: Room, items: MediaAsset[]): Promise<void> {
    this.error.set(null);
    try {
      const media = mediaWriteFields(items, []);
      await this.roomsApi.updateRoom(room.id, {
        images: media.images,
        imageUrls: media.imageUrls,
      });
      this.notice.set('Room photos saved.');
      await this.load();
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not save room photos.');
    }
  }
}

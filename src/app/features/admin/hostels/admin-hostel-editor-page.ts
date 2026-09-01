import { Location, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CLOUDINARY_FOLDERS } from '../../../core/constants/cloudinary';
import { DEFAULT_FACILITY_NAMES } from '../../../core/models/facility.model';
import { HOSTEL_TYPES, HostelWriteInput } from '../../../core/models/hostel.model';
import { MediaAsset } from '../../../core/models/media.model';
import { HostelContactService } from '../../../core/services/hostel-contact.service';
import { HostelService } from '../../../core/services/hostel.service';
import { SeoService } from '../../../core/services/seo.service';
import { AppError } from '../../../core/utils/error.util';
import { hydrateMediaList, logMediaDebug, mediaWriteFields } from '../../../core/utils/cloudinary.util';
import { slugify } from '../../../core/utils/slug.util';
import { MediaUploader } from '../../../shared/components/media-uploader/media-uploader';

@Component({
  selector: 'app-admin-hostel-editor-page',
  imports: [ReactiveFormsModule, RouterLink, MediaUploader],
  templateUrl: './admin-hostel-editor-page.html',
  styleUrl: './admin-hostel-editor-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHostelEditorPage {
  private readonly fb = inject(FormBuilder);
  private readonly hostels = inject(HostelService);
  private readonly contacts = inject(HostelContactService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly location = inject(Location);

  readonly types = HOSTEL_TYPES;
  readonly facilityOptions = DEFAULT_FACILITY_NAMES;
  readonly folders = CLOUDINARY_FOLDERS;
  readonly hostelId = signal<string | null>(this.route.snapshot.paramMap.get('id'));
  readonly saving = signal(false);
  readonly savePhase = signal<'idle' | 'saving-draft' | 'publishing'>('idle');
  readonly currentStatus = signal<'draft' | 'published' | 'unpublished' | 'new'>('new');
  readonly statusMessage = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly statusLabel = computed(() => {
    switch (this.currentStatus()) {
      case 'published':
        return 'Published — visible on the public website';
      case 'draft':
        return 'Draft — not visible publicly';
      case 'unpublished':
        return 'Unpublished — hidden from the public website';
      default:
        return 'Not saved yet';
    }
  });
  readonly images = signal<MediaAsset[]>([]);
  readonly videos = signal<MediaAsset[]>([]);
  readonly coverPublicId = signal<string | null>(null);
  readonly selectedFacilities = signal<string[]>([]);
  readonly photosBusy = signal(false);
  readonly videosBusy = signal(false);
  readonly mediaBusy = computed(() => this.photosBusy() || this.videosBusy());

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    type: ['boys', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    address: ['', Validators.required],
    area: ['', Validators.required],
    city: ['', Validators.required],
    state: ['Madhya Pradesh', Validators.required],
    pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    latitude: [''],
    longitude: [''],
    mapUrl: [''],
    startingPrice: [0, [Validators.required, Validators.min(0)]],
    deposit: [0],
    slug: [''],
    seoTitle: [''],
    seoDescription: [''],
    contactName: [''],
    contactPhone: [''],
    contactEmail: [''],
    customFacility: [''],
    isFeatured: [false],
    isVerified: [false],
    isActive: [true],
  });

  constructor() {
    this.seo.set({ title: 'Edit hostel', description: 'Admin hostel editor', noIndex: true });
    if (isPlatformBrowser(this.platformId) && this.hostelId()) {
      void this.load();
    }
  }

  toggleFacility(name: string): void {
    const current = this.selectedFacilities();
    this.selectedFacilities.set(
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  }

  addCustomFacility(): void {
    const value = this.form.controls.customFacility.value.trim();
    if (value && !this.selectedFacilities().includes(value)) {
      this.selectedFacilities.set([...this.selectedFacilities(), value]);
    }
    this.form.controls.customFacility.setValue('');
  }

  async load(): Promise<void> {
    const id = this.hostelId();
    if (!id) {
      return;
    }
    try {
      const hostel = await this.hostels.getById(id);
      if (!hostel) {
        this.error.set('Hostel not found.');
        return;
      }
      this.currentStatus.set(hostel.status);
      this.form.patchValue({
        name: hostel.name,
        type: hostel.type,
        description: hostel.description,
        address: hostel.address,
        area: hostel.area,
        city: hostel.city,
        state: hostel.state,
        pincode: hostel.pincode,
        latitude: hostel.latitude != null ? String(hostel.latitude) : '',
        longitude: hostel.longitude != null ? String(hostel.longitude) : '',
        mapUrl: hostel.mapUrl ?? '',
        startingPrice: hostel.startingPrice,
        deposit: hostel.deposit ?? 0,
        slug: hostel.slug,
        seoTitle: hostel.seo?.title ?? '',
        seoDescription: hostel.seo?.description ?? '',
        isFeatured: hostel.isFeatured,
        isVerified: hostel.isVerified,
        isActive: hostel.isActive,
      });
      this.selectedFacilities.set([...hostel.facilities]);
      this.images.set(
        hydrateMediaList(hostel.images, hostel.imageUrls, 'image', CLOUDINARY_FOLDERS.hostels),
      );
      this.videos.set(
        hydrateMediaList(hostel.videos, hostel.videoUrls, 'video', CLOUDINARY_FOLDERS.videos),
      );
      this.coverPublicId.set(
        hostel.coverPublicId ??
          this.images().find((item) => item.secureUrl === hostel.coverImage)?.publicId ??
          this.images()[0]?.publicId ??
          null,
      );
      const contact = await this.contacts.getByHostelId(id);
      if (contact) {
        this.form.patchValue({
          contactName: contact.contactName,
          contactPhone: contact.phone,
          contactEmail: contact.email ?? '',
        });
      }
    } catch (error) {
      this.error.set(error instanceof AppError ? error.userMessage : 'Could not load hostel.');
    }
  }

  async save(status: 'draft' | 'published'): Promise<void> {
    this.form.markAllAsTouched();
    if (this.saving() || this.mediaBusy()) {
      return;
    }
    if (this.form.invalid) {
      this.error.set(
        status === 'published'
          ? 'Fill every required field before publishing this hostel.'
          : 'Fill every required field before saving this draft.',
      );
      this.statusMessage.set(null);
      return;
    }
    if (this.mediaBusy()) {
      this.error.set('Wait for the current photo or video upload to finish, then save.');
      this.statusMessage.set(null);
      return;
    }
    this.saving.set(true);
    this.savePhase.set(status === 'published' ? 'publishing' : 'saving-draft');
    this.error.set(null);
    this.statusMessage.set(null);
    try {
      const input = this.toWriteInput(status);
      logMediaDebug('hostel-save', {
        coverImage: input.coverImage,
        imageUrls: input.imageUrls,
        videoUrls: input.videoUrls,
        status,
      });
      let id = this.hostelId();
      if (!id) {
        id = await this.hostels.createHostel(input);
        this.hostelId.set(id);
        this.location.replaceState(`/admin/hostels/${id}/edit`);
      } else {
        await this.hostels.updateHostel(id, input);
      }
      if (status === 'published') {
        await this.hostels.publishHostel(id);
        this.currentStatus.set('published');
        this.statusMessage.set('Published. This hostel is now visible on the public website.');
      } else {
        await this.hostels.setStatus(id, 'draft', this.form.controls.isActive.value);
        this.currentStatus.set('draft');
        this.statusMessage.set('Draft saved. It is not visible on the public website yet.');
      }
      await this.saveContact(id);
    } catch (error) {
      this.error.set(
        error instanceof AppError
          ? `Could not ${status === 'published' ? 'publish' : 'save'} hostel. ${error.userMessage}`
          : status === 'published'
            ? 'Publishing failed. Check your connection and try again.'
            : 'Could not save hostel.',
      );
    } finally {
      this.savePhase.set('idle');
      this.saving.set(false);
    }
  }

  onImages(items: MediaAsset[]): void {
    this.images.set(items);
    if (!this.coverPublicId() && items[0]) {
      this.coverPublicId.set(items[0].publicId);
    }
    void this.persistMedia();
  }

  onVideos(items: MediaAsset[]): void {
    this.videos.set(items);
    void this.persistMedia();
  }

  onFeatured(publicId: string | null): void {
    this.coverPublicId.set(publicId);
    void this.persistMedia();
  }

  onPhotosBusy(busy: boolean): void {
    this.photosBusy.set(busy);
  }

  onVideosBusy(busy: boolean): void {
    this.videosBusy.set(busy);
  }

  private async persistMedia(): Promise<void> {
    const id = this.hostelId();
    if (!id) {
      return;
    }
    const media = mediaWriteFields(this.images(), this.videos(), this.coverPublicId());
    logMediaDebug('persist-media', {
      hostelId: id,
      coverImage: media.coverImage,
      imageCount: media.imageUrls.length,
    });
    try {
      await this.hostels.updateHostel(id, media);
    } catch (error) {
      this.error.set(
        error instanceof AppError
          ? error.userMessage
          : 'Media uploaded, but saving it to this hostel failed. Click Save draft.',
      );
    }
  }

  private toWriteInput(status: 'draft' | 'published'): HostelWriteInput {
    const value = this.form.getRawValue();
    const media = mediaWriteFields(this.images(), this.videos(), this.coverPublicId());
    return {
      name: value.name.trim(),
      slug: slugify(value.slug || value.name),
      description: value.description.trim(),
      type: value.type as HostelWriteInput['type'],
      address: value.address.trim(),
      area: value.area.trim(),
      city: value.city.trim(),
      state: value.state.trim(),
      pincode: value.pincode,
      latitude: value.latitude ? Number(value.latitude) : undefined,
      longitude: value.longitude ? Number(value.longitude) : undefined,
      mapUrl: value.mapUrl || undefined,
      ...media,
      facilities: this.selectedFacilities(),
      startingPrice: Number(value.startingPrice),
      deposit: Number(value.deposit) || undefined,
      isFeatured: value.isFeatured,
      isVerified: value.isVerified,
      isActive: status === 'published' ? true : value.isActive,
      status,
      seo: {
        title: value.seoTitle || undefined,
        description: value.seoDescription || undefined,
      },
    };
  }

  private async saveContact(hostelId: string): Promise<void> {
    const value = this.form.getRawValue();
    if (!value.contactName || !value.contactPhone) {
      return;
    }
    await this.contacts.upsert({
      hostelId,
      contactName: value.contactName,
      phone: value.contactPhone,
      email: value.contactEmail || undefined,
    });
  }
}

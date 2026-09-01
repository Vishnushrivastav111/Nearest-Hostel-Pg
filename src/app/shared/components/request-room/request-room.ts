import { Location, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Timestamp } from 'firebase/firestore';
import { Hostel } from '../../../core/models/hostel.model';
import { Room } from '../../../core/models/room.model';
import { AuthService } from '../../../core/services/auth.service';
import { LeadService } from '../../../core/services/lead.service';
import { UserService } from '../../../core/services/user.service';
import { AppError } from '../../../core/utils/error.util';
import {
  indianMobileValidator,
  isValidIndianMobile,
  normalizeIndianMobile,
} from '../../../core/utils/phone.util';

@Component({
  selector: 'app-request-room',
  imports: [ReactiveFormsModule],
  templateUrl: './request-room.html',
  styleUrl: './request-room.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestRoom implements OnInit, OnDestroy {
  readonly hostel = input.required<Hostel>();
  readonly rooms = input<Room[]>([]);
  readonly selectedRoomId = input<string | null>(null);
  readonly closed = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly leads = inject(LeadService);
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private redirectTimer: ReturnType<typeof setTimeout> | undefined;

  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    customerName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    customerPhone: ['', [Validators.required, indianMobileValidator()]],
    customerEmail: ['', [Validators.email]],
    roomId: [''],
    moveInDate: [''],
    occupants: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    message: ['', Validators.maxLength(500)],
  });

  async ngOnInit(): Promise<void> {
    const roomId = this.selectedRoomId();
    if (roomId) {
      this.form.patchValue({ roomId });
    }
    await this.prefillFromUser();
  }

  ngOnDestroy(): void {
    this.clearRedirect();
  }

  close(): void {
    this.clearRedirect();
    this.goBack();
  }

  normalizePhone(): void {
    const phone = normalizeIndianMobile(this.form.controls.customerPhone.value);
    if (phone && phone !== this.form.controls.customerPhone.value) {
      this.form.controls.customerPhone.setValue(phone, { emitEvent: false });
    }
  }

  async submit(): Promise<void> {
    this.errorMessage.set(null);
    this.normalizePhone();
    this.form.markAllAsTouched();
    if (this.submitting() || this.success()) {
      return;
    }
    if (this.form.invalid) {
      this.errorMessage.set(this.validationMessage());
      return;
    }
    const value = this.form.getRawValue();
    if (!isValidIndianMobile(value.customerPhone)) {
      this.errorMessage.set('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    const hostel = this.hostel();
    if (!hostel?.id) {
      this.errorMessage.set('This hostel could not be identified. Please refresh and try again.');
      return;
    }

    this.submitting.set(true);
    try {
      const room = this.rooms().find((item) => item.id === value.roomId);
      const user = this.auth.currentUser();
      const moveIn = parseMoveInDate(value.moveInDate);
      await this.leads.createLead({
        hostelId: hostel.id,
        hostelName: hostel.name,
        roomId: value.roomId || undefined,
        roomName: room?.roomName,
        userId: user?.uid,
        customerName: value.customerName,
        customerPhone: value.customerPhone,
        customerEmail: value.customerEmail || undefined,
        moveInDate: moveIn,
        occupants: Number(value.occupants) || 1,
        message: value.message || undefined,
      });
      this.success.set(true);
      this.redirectTimer = setTimeout(() => this.goBack(), 1400);
    } catch (error) {
      this.errorMessage.set(
        error instanceof AppError ? error.userMessage : 'Could not submit your request. Please try again.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  private async prefillFromUser(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) {
      return;
    }
    this.form.patchValue({
      customerName: user.displayName || user.email?.split('@')[0] || '',
      customerEmail: user.email || '',
    });
    try {
      const profile = await this.users.getById(user.uid);
      if (!profile) {
        return;
      }
      this.form.patchValue({
        customerName: profile.name || this.form.controls.customerName.value,
        customerPhone:
          (profile.phone && isValidIndianMobile(profile.phone)
            ? normalizeIndianMobile(profile.phone)
            : profile.phone) || this.form.controls.customerPhone.value,
        customerEmail: profile.email || user.email || '',
      });
    } catch {
      // Form stays with auth values.
    }
  }

  private validationMessage(): string {
    const controls = this.form.controls;
    if (controls.customerName.invalid) {
      return 'Please enter your name.';
    }
    if (controls.customerPhone.invalid) {
      return 'Enter a valid 10-digit Indian mobile number.';
    }
    if (controls.customerEmail.invalid) {
      return 'Please enter a valid email address.';
    }
    if (controls.occupants.invalid) {
      return 'Occupants must be between 1 and 12.';
    }
    if (controls.message.invalid) {
      return 'Message is too long.';
    }
    return 'Please check the form and try again.';
  }

  private goBack(): void {
    this.clearRedirect();
    this.closed.emit();
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    const hostel = this.hostel();
    void this.router.navigate(['/hostels', hostel.slug || hostel.id]);
  }

  private clearRedirect(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = undefined;
    }
  }
}

function parseMoveInDate(value: string): Timestamp | undefined {
  const raw = value.trim();
  if (!raw) {
    return undefined;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return Timestamp.fromDate(parsed);
}

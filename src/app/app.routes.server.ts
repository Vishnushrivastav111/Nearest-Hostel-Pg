import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'hostels/:slug', renderMode: RenderMode.Server },
  { path: 'login', renderMode: RenderMode.Server },
  { path: 'admin/login', renderMode: RenderMode.Server },
  { path: 'admin', renderMode: RenderMode.Server },
  { path: 'admin/dashboard', renderMode: RenderMode.Server },
  { path: 'admin/hostels', renderMode: RenderMode.Server },
  { path: 'admin/hostels/new', renderMode: RenderMode.Server },
  { path: 'admin/hostels/:id/edit', renderMode: RenderMode.Server },
  { path: 'admin/hostels/:id/rooms', renderMode: RenderMode.Server },
  { path: 'admin/leads', renderMode: RenderMode.Server },
  { path: 'admin/bookings', renderMode: RenderMode.Server },
  { path: 'admin/commissions', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Prerender },
];

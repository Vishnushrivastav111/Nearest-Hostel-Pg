import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { HomePage } from './features/public/home/home-page';
import { PublicLayout } from './layouts/public-layout/public-layout';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        component: HomePage,
      },
      {
        path: 'hostels',
        loadComponent: () =>
          import('./features/public/hostel-list/hostel-list-page').then((m) => m.HostelListPage),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/public/hostel-list/hostel-list-page').then((m) => m.HostelListPage),
      },
      {
        path: 'hostels/:slug',
        loadComponent: () =>
          import('./features/public/hostel-details/hostel-details-page').then(
            (m) => m.HostelDetailsPage,
          ),
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./features/public/account/account-page').then((m) => m.AccountPage),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./features/public/content/content-page').then((m) => m.ContentPage),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/public/content/content-page').then((m) => m.ContentPage),
      },
      {
        path: 'privacy-policy',
        loadComponent: () =>
          import('./features/public/content/content-page').then((m) => m.ContentPage),
      },
      {
        path: 'privacy',
        redirectTo: 'privacy-policy',
        pathMatch: 'full',
      },
      {
        path: 'terms',
        loadComponent: () =>
          import('./features/public/content/content-page').then((m) => m.ContentPage),
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/admin/login/admin-login-page').then((m) => m.AdminLoginPage),
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/login/admin-login-page').then((m) => m.AdminLoginPage),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout').then((m) => m.AdminLayout),
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard-page').then((m) => m.AdminDashboardPage),
      },
      {
        path: 'hostels',
        loadComponent: () =>
          import('./features/admin/hostels/admin-hostels-page').then((m) => m.AdminHostelsPage),
      },
      {
        path: 'hostels/new',
        loadComponent: () =>
          import('./features/admin/hostels/admin-hostel-editor-page').then(
            (m) => m.AdminHostelEditorPage,
          ),
      },
      {
        path: 'hostels/:id/edit',
        loadComponent: () =>
          import('./features/admin/hostels/admin-hostel-editor-page').then(
            (m) => m.AdminHostelEditorPage,
          ),
      },
      {
        path: 'hostels/:id/rooms',
        loadComponent: () =>
          import('./features/admin/rooms/admin-rooms-page').then((m) => m.AdminRoomsPage),
      },
      {
        path: 'amenities',
        loadComponent: () =>
          import('./features/admin/amenities/admin-amenities-page').then(
            (m) => m.AdminAmenitiesPage,
          ),
      },
      {
        path: 'leads',
        loadComponent: () =>
          import('./features/admin/leads/admin-leads-page').then((m) => m.AdminLeadsPage),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./features/admin/bookings/admin-bookings-page').then((m) => m.AdminBookingsPage),
      },
      {
        path: 'commissions',
        loadComponent: () =>
          import('./features/admin/commissions/admin-commissions-page').then(
            (m) => m.AdminCommissionsPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

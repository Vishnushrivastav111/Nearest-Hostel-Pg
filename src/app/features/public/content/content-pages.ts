export interface ContentSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface ContentCopy {
  readonly title: string;
  readonly description: string;
  readonly intro: string;
  readonly sections: readonly ContentSection[];
}

export const CONTENT_PAGES: Record<string, ContentCopy> = {
  about: {
    title: 'About Nearest Hostel',
    description:
      'Nearest Hostel is a hostel and PG marketplace. The website admin manages every listing. Visitors browse published hostels and request a room.',
    intro:
      'Nearest Hostel helps students and working professionals find a hostel or PG. You browse published listings. The website admin manages every hostel, room, photo, and price.',
    sections: [
      {
        heading: 'How it works',
        paragraphs: [
          'Search by city, area, budget, or sharing type. Open a published hostel to see photos, videos, facilities, rooms, and prices.',
          'When you find a room, submit a request with your name and mobile number. Our team contacts you about availability. A request is an enquiry, not an online payment.',
        ],
      },
      {
        heading: 'Who manages listings',
        paragraphs: [
          'Only the website admin can add, edit, publish, or remove hostels and rooms. There is no hostel-owner login on this website.',
        ],
      },
    ],
  },
  contact: {
    title: 'Contact',
    description:
      'Request a room from any published hostel page. The Nearest Hostel team will call you about availability.',
    intro:
      'The fastest way to reach us is to request a room on a published hostel page. We use the name and mobile number you submit to call you back.',
    sections: [
      {
        heading: 'Room enquiry',
        paragraphs: [
          'Open a hostel, choose a room, and tap Request a Room. Tell us your move-in date if you know it.',
          'Do not share passwords or payment details in the enquiry form. We will never ask for them there.',
        ],
      },
      {
        heading: 'What happens next',
        paragraphs: [
          'An admin reviews your request, checks availability, and contacts you. If you take the room, the admin records the booking.',
        ],
      },
    ],
  },
  'privacy-policy': {
    title: 'Privacy policy',
    description:
      'Nearest Hostel collects enquiry details so we can contact you about a room. Hostel contact details stay private for admin use.',
    intro:
      'This policy explains what we collect when you use Nearest Hostel, why we collect it, and who can see it.',
    sections: [
      {
        heading: 'What we collect',
        paragraphs: [
          'If you submit a room request, we collect your name, mobile number, optional email, move-in date, and the hostel or room you asked about.',
          'If you create an account, we also store the email you use to sign in. We never store your password in our database. Sign-in is handled by Firebase Authentication.',
        ],
      },
      {
        heading: 'How we use it',
        paragraphs: [
          'We use enquiry details to call or message you about availability and next steps. Admins use the same details to manage leads and bookings.',
          'We do not sell customer information. We do not show your name, phone, or email on public hostel pages, search results, or sharing previews.',
        ],
      },
      {
        heading: 'Who can see your details',
        paragraphs: [
          'Website admins can view complete lead and booking information so they can contact you and the hostel.',
          'Private hostel phone numbers and emails are stored separately for admin use. Customers cannot see those contacts on this website.',
        ],
      },
      {
        heading: 'Cookies and analytics',
        paragraphs: [
          'The site may use basic analytics and authentication cookies so pages load correctly and signed-in users stay signed in.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    description:
      'Nearest Hostel listings are informational. A room request is an enquiry, not a paid booking.',
    intro:
      'By using this website you agree that listings are for information, and a room request is an enquiry rather than an online booking payment.',
    sections: [
      {
        heading: 'Listings',
        paragraphs: [
          'Photos, prices, facilities, and availability are managed by the website admin. Details can change when a room is taken or a listing is updated.',
          'Draft or unpublished hostels are not public and must not be treated as available.',
        ],
      },
      {
        heading: 'Room requests',
        paragraphs: [
          'Submitting a request does not reserve a bed by itself. The admin confirms availability with the hostel before any stay is recorded.',
          'Please submit accurate contact details. Repeat accidental submissions of the same request in a short time may be ignored.',
        ],
      },
      {
        heading: 'Acceptable use',
        paragraphs: [
          'Do not attempt to access the admin console, other customers’ requests, or private hostel contacts. Do not submit false enquiries.',
        ],
      },
    ],
  },
};

export function contentKeyFromUrl(url: string): string {
  const path = url.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const key = path.split('/').filter(Boolean).at(-1) ?? '';
  return key in CONTENT_PAGES ? key : 'about';
}

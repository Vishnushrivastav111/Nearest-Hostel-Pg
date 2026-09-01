import { isAdminEmail } from './admin-emails';

describe('isAdminEmail', () => {
  it('allows only the configured admin inboxes', () => {
    expect(isAdminEmail('vishnushrivastav26072003@gmail.com')).toBeTrue();
    expect(isAdminEmail('  RealVishnu111@gmail.com  ')).toBeTrue();
    expect(isAdminEmail('customer@example.com')).toBeFalse();
  });
});

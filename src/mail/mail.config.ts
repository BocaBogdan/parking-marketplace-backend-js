import { registerAs } from '@nestjs/config';

export const mailConfig = registerAs('mail', () => ({
  /** Unset in development: emails are logged instead of sent */
  apiKey: process.env.RESEND_API_KEY,
  from:
    process.env.MAIL_FROM ??
    'Residential Parking <invitatii@mail.residentialparking.ro>',
}));

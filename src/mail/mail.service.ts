import { Inject, Injectable, Logger } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { Resend, type CreateEmailOptions } from 'resend';
import { mailConfig } from './mail.config.js';

const MAX_ATTEMPTS = 3;
const APP_NAME = 'Residential Parking';

export interface InviteMail {
  to: string;
  /** The Clerk invitation link that signs them up */
  url: string;
  /** Same key, same email: Resend sends it once within 24 hours */
  idempotencyKey: string;
  buildingName?: string;
  apartment?: string;
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Our own emails, since Clerk's free plan can't customize its templates */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend?: Resend;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly config: ConfigType<typeof mailConfig>,
  ) {
    if (config.apiKey) this.resend = new Resend(config.apiKey);
  }

  async sendInvite({
    to,
    url,
    idempotencyKey,
    buildingName,
    apartment,
  }: InviteMail) {
    const admin = buildingName
      ? `Administratorul clădirii ${buildingName}`
      : 'Administratorul clădirii tale';
    const intro = apartment
      ? `${admin} te-a adăugat ca proprietar al apartamentului ${apartment} în ${APP_NAME}.`
      : `${admin} te-a adăugat în ${APP_NAME}.`;
    const about =
      'O aplicație prin care vecinii își pun la dispoziție locurile de parcare când nu le folosesc. Tu decizi când e liber locul tău și vezi oricând cine a parcat pe el; poți rezerva și tu locul unui vecin când ai nevoie.';
    const steps = [
      'Apasă butonul de mai jos.',
      'Creează-ți contul cu această adresă de email.',
      'Adaugă orele în care locul tău e liber.',
    ];
    const reassurance =
      'Contul e gratuit și nu îți dă nimeni acces la locul tău fără acordul tău.';
    const footer =
      'Primești acest email pentru că administratorul clădirii te-a adăugat. Dacă nu locuiești aici sau crezi că e o greșeală, îl poți ignora.';
    const link = escapeHtml(url);

    await this.send(idempotencyKey, {
      from: this.config.from,
      to,
      subject: buildingName
        ? `Invitație de la administratorul clădirii ${buildingName}`
        : `Invitație în ${APP_NAME}`,
      text: [
        'Bună,',
        intro,
        `Ce e ${APP_NAME}?\n${about}`,
        `Cum începi:\n${steps.map((step, i) => `  ${i + 1}. ${step}`).join('\n')}`,
        `Creează-ți contul: ${url}`,
        reassurance,
        `---\n${footer}`,
      ].join('\n\n'),
      html: `<div style="display: none; max-height: 0; overflow: hidden">Trei pași ca să începi să împarți locul de parcare.</div>
<div style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px 16px; font-size: 15px; line-height: 1.6; color: #1a1a1a">
  <p>Bună,</p>
  <p>${escapeHtml(intro)}</p>
  <p style="margin: 24px 0 4px; font-weight: 600">Ce e ${APP_NAME}?</p>
  <p style="margin-top: 0">${about}</p>
  <p style="margin: 24px 0 4px; font-weight: 600">Cum începi:</p>
  <ol style="margin-top: 0; padding-left: 20px">
    ${steps.map((step) => `<li>${step}</li>`).join('\n    ')}
  </ol>
  <p style="margin: 28px 0">
    <a href="${link}" style="background: #2563eb; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block">Creează-ți contul</a>
  </p>
  <p>${reassurance}</p>
  <p style="font-size: 13px; color: #666">Dacă butonul nu merge, deschide linkul:<br><a href="${link}" style="color: #2563eb; word-break: break-all">${link}</a></p>
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0">
  <p style="font-size: 13px; color: #666">${footer}</p>
</div>`,
    });
  }

  /** Retries network errors, 5xx and rate limits; other errors are ours to fix */
  private async send(idempotencyKey: string, email: CreateEmailOptions) {
    if (!this.resend) {
      this.logger.log(`RESEND_API_KEY unset, not sending:\n${email.text}`);
      return;
    }
    for (let attempt = 1; ; attempt++) {
      const { data, error, headers } = await this.resend.emails.send(email, {
        idempotencyKey,
      });
      if (data) {
        this.logger.log(`Sent email ${data.id} to ${String(email.to)}`);
        return;
      }
      const retryable =
        error.statusCode === null ||
        error.statusCode === 429 ||
        error.statusCode >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS) {
        throw new Error(`Resend: ${error.name}: ${error.message}`);
      }
      const retryAfter = Number(headers?.['retry-after']);
      await new Promise((resolve) =>
        setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 500 * attempt),
      );
    }
  }
}

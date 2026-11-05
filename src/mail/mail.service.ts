import { Inject, Injectable, Logger } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { Resend, type CreateEmailOptions } from 'resend';
import { mailConfig } from './mail.config.js';

const MAX_ATTEMPTS = 3;

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
    const place = [
      buildingName && `clădirea ${buildingName}`,
      apartment && `apartamentul ${apartment}`,
    ]
      .filter(Boolean)
      .join(', ');
    const intro = place
      ? `Ai fost invitat în aplicația de parcare pentru ${place}.`
      : 'Ai fost invitat în aplicația de parcare.';

    await this.send(idempotencyKey, {
      from: this.config.from,
      to,
      subject: 'Invitație în aplicația de parcare',
      text: `Bună,\n\n${intro}\n\nCreează-ți contul aici:\n${url}\n\nDacă nu te așteptai la acest email, îl poți ignora.`,
      html: `<div style="font-family: sans-serif; max-width: 480px; margin: auto; line-height: 1.5; color: #1a1a1a">
  <p>Bună,</p>
  <p>${escapeHtml(intro)}</p>
  <p style="margin: 24px 0">
    <a href="${escapeHtml(url)}" style="background: #2563eb; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block">Creează-ți contul</a>
  </p>
  <p style="font-size: 13px; color: #666">Dacă butonul nu merge, deschide linkul: <br><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
  <p style="font-size: 13px; color: #666">Dacă nu te așteptai la acest email, îl poți ignora.</p>
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

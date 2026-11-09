import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
export class AppController {
  /** Liveness only: it doesn't touch the database, so keep-alive pings don't wake Neon */
  @SkipThrottle()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

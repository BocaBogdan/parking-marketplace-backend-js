import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  /** Liveness only: it doesn't touch the database, so keep-alive pings don't wake Neon */
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

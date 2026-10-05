# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build              # Compile (nest build)
npm run start:dev          # Dev server with watch mode
npm run lint               # Lint with oxlint (type-aware, covers src/ and test/)
npm run format             # Format with Prettier
npm test                   # Run all unit tests (vitest)
npx vitest run src/app.controller.spec.ts   # Run a single test file
npm run test:e2e           # Run e2e tests (separate vitest config)
npm run test:cov           # Unit tests with coverage
```

## Architecture

NestJS 12 backend using ESM (`"type": "module"` in package.json). TypeScript compiles to ES2023 with `nodenext` module resolution. Local imports must use `.js` extensions (e.g., `import { AppService } from './app.service.js'`).

Entry point is `src/main.ts` which bootstraps a NestJS app listening on `PORT` env var (default 3000). The app follows standard NestJS module/controller/service pattern with `AppModule` as the root module.

## Tooling

- **Test runner:** Vitest with globals enabled — no need to import `describe`/`it`/`expect`. Unit tests use `*.spec.ts` pattern (co-located in `src/`), e2e tests use `*.e2e-spec.ts` (in `test/`).
- **Linter:** oxlint with type-aware checking. `no-floating-promises` is set to error; `no-explicit-any` is off.
- **Formatter:** Prettier with single quotes and trailing commas.

## Code Style

- Single quotes, trailing commas everywhere (Prettier enforced)
- Strict TypeScript with `strictPropertyInitialization` disabled (NestJS DI pattern)
- `emitDecoratorMetadata` and `experimentalDecorators` enabled for NestJS decorators

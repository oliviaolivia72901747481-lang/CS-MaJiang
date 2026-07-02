# Repository Guidelines

## Project Structure & Module Organization

This is a TypeScript Changsha Mahjong project with a Vite/React frontend and a Socket.IO online-play layer. Core rule logic lives in `src/changsha-mahjong/`, grouped by domain: `engine/`, `controller/`, `ai/`, `advanced-ai/`, `coach/`, `benchmark/`, `types/`, and `utils/`. The browser UI is split between `src/changsha-mahjong-ui/` for local play and `src/changsha-mahjong-network/` for online rooms, clients, server code, network components, and online styles. Tests are colocated in each package's `__tests__/` directory. Project reports and manual checklists live in `docs/`; generated build output goes to `dist/` and should not be edited directly.

## Build, Test, and Development Commands

- `npm run dev`: start the Vite development server for the React app.
- `npm test`: run the Vitest suite once.
- `npm run test:watch`: run Vitest in watch mode during development.
- `npm run build`: type-check with `tsc`, then build the Vite app.
- `npm run server`: compile TypeScript and run the online Mahjong server from `dist/changsha-mahjong-network/server/index.js`.
- `npm run dev:online` or `npm run dev:lan`: run the compiled server and Vite together for multiplayer testing on port `5173`.

## Coding Style & Naming Conventions

Use strict TypeScript and ES modules. Follow the existing two-space indentation, single quotes, semicolons, and named exports. Keep file names kebab-case for modules and components, for example `score-engine.ts` and `OnlineLobbyPage.tsx`. Import local TypeScript modules with `.js` extensions, matching the current NodeNext configuration. Put shared data shapes under `types/`; keep rule calculations in `engine/` and UI-only behavior in UI or network components.

## Testing Guidelines

Use Vitest. Name tests `*.test.ts` or `*.test.tsx` and place them in the nearest `__tests__/` directory. Add focused regression tests for rule changes, server/session behavior, and UI interaction fixes. Run `npm test` before submitting changes; run `npm run build` when touching exports, server code, or TypeScript configuration.

## Commit & Pull Request Guidelines

The current Git history uses Conventional Commit style, with a `feat:` initialization commit. Prefer short prefixes such as `feat:`, `fix:`, `test:`, `docs:`, or `refactor:`. Pull requests should include a concise change summary, test results, linked issue or task context when available, and screenshots or short notes for visible UI changes. For LAN or online-play changes, mention any manual room-join or reconnect checks performed.

## Security & Configuration Tips

Do not commit local secrets, machine-specific addresses, or generated `node_modules/` and `dist/` contents. Keep LAN testing details in PR notes or `docs/` reports rather than hard-coding them into source files.

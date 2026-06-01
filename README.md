# jenktrace

A fast Electrobun desktop app for Jenkins monitoring, built with React, Tailwind CSS v4, shadcn/base UI, and Vite for hot module replacement (HMR).

## Getting Started

```bash
# Install dependencies
bun install

# Development without HMR (uses bundled assets)
bun run dev

# Development with HMR (recommended)
bun run dev:hmr

# Lint the project
bun run lint

# Format the project
bun run format

# Run the full local quality gate
bun run check

# Build for production
bun run build

# Build for production release
bun run build:canary

# Build a stable release artifact
bun run build:stable
```

## How HMR Works

When you run `bun run dev:hmr`:

1. **Vite dev server** starts on `http://localhost:5173` with HMR enabled
2. **Electrobun** starts and detects the running Vite server
3. The app loads from the Vite dev server instead of bundled assets
4. Changes to React components update instantly without full page reload

When you run `bun run dev` (without HMR):

1. Electrobun starts and loads from `views://mainview/index.html`
2. You need to rebuild (`bun run build`) to see changes

## Project Structure

```
├── src/
│   ├── bun/
│   │   └── index.ts        # Main process (Electrobun/Bun)
│   └── mainview/
│       ├── App.tsx         # React app component
│       ├── main.tsx        # React entry point
│       ├── components/ui/  # shadcn base UI components
│       ├── lib/utils.ts    # Shared utilities
│       ├── index.html      # HTML template
│       └── index.css       # Tailwind v4 + theme tokens
├── electrobun.config.ts    # Electrobun configuration
├── vite.config.ts          # Vite configuration
├── components.json         # shadcn configuration
├── biome.json              # Biome linter/formatter config
├── .editorconfig           # Shared editor defaults
└── package.json
```

## Customizing

- **React components**: Edit files in `src/mainview/`
- **Tailwind theme**: Edit `src/mainview/index.css`
- **shadcn components**: Add or update files in `src/mainview/components/ui/`
- **Vite settings**: Edit `vite.config.ts`
- **Window settings**: Edit `src/bun/index.ts`
- **App metadata**: Edit `electrobun.config.ts`

## Quality Checks

- `bun run lint`: run Biome checks
- `bun run lint:fix`: apply safe Biome fixes
- `bun run format`: format the codebase with Biome
- `bun run check`: run lint, TypeScript, and production build together

GitHub Actions runs `bun run check` on pushes and pull requests. When you push a tag, GitHub Actions runs `bun run build:stable`, uploads `artifacts/*` to the workflow run, and publishes the same files on the GitHub Release for that tag.

## Git Hooks

This repo uses `husky` and `lint-staged` for a lightweight pre-commit check.

- On commit, staged `js`, `ts`, `tsx`, `json`, `css`, and `md` files are passed through `biome check --write`
- To re-enable hooks after a fresh install, run `bun run prepare`

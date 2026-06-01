This project use `bun` to manage packages and use `bunx` to run cli commands.
The app framework is `electrobun` with `react` + `vite` + `tailwind`
After every code change, always run `bun run lint` and `bun run check` before finishing.
Before creating new component, check if there is component that Shadcn already has.
Current UI design rules:
- Prefer `shadcn/ui` components and composition over custom containers or direct `@base-ui/react` usage in page files.
- Use `Dialog` for create or edit flows, and `AlertDialog` for destructive confirmation flows.
- Use `Alert` for inline error, warning, or success feedback instead of hand-rolled bordered message boxes.
- Use `Skeleton` for loading placeholders and `Card` composition for summaries, empty states, and detail tiles.
- Keep page containers thin: route or screen files should own state and data fetching, while presentational sections and dialogs should live in dedicated component files.
- Reuse semantic tokens and existing variants; avoid one-off color styling unless the current design system does not cover the case.

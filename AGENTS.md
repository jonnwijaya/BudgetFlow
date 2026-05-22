# BudgetFlow — Agent Context

> This file is written for AI coding agents. It describes the actual state of the codebase as of the latest commit. Do not assume features exist unless they are explicitly described here.

---

## Project Overview

**BudgetFlow** is a personal expense tracking Progressive Web App (PWA) built with Next.js 15 and React 18. It allows users to record expenses, set savings goals, define monthly budget thresholds, visualize spending breakdowns via interactive charts, and export/import data as CSV.

**Current runtime mode:** The app operates entirely in **guest/local mode**. All data persists to the browser's `localStorage`. There is no active backend, authentication, or cloud sync at this time. Auth pages (`/login`, `/register`, `/forgot-password`, `/update-password`) exist as stubs that immediately redirect to `/`.

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.2.3 |
| Language | TypeScript | ~5 |
| Runtime | React | 18.3.1 |
| Styling | Tailwind CSS | 3.4.1 |
| UI Primitives | shadcn/ui (Radix + CVA) | — |
| Icons | Lucide React | — |
| Forms | react-hook-form + Zod | — |
| Charts | Recharts | — |
| Dates | date-fns | — |
| Themes | next-themes | — |
| PWA | @ducanh2912/next-pwa | — |
| Analytics | Vercel Analytics & Speed Insights | — |

**Notable removed dependencies (ghosts in git history):**
- Genkit AI flows (`src/ai/`) — expense categorization and financial tip generation were deleted.
- Supabase client (`src/lib/supabaseClient.ts`) — previously used for auth and cloud persistence.
- Achievement helper logic (`src/lib/achievementsHelper.ts`) — achievement evaluation was deleted.
- `@tanstack/react-query`, `@tanstack-query-firebase/react`, `firebase` — unused query and Firebase SDKs.
- `@opentelemetry/exporter-jaeger`, `patch-package` — unused dev dependencies.

---

## Build & Development Commands

All commands are defined in `package.json`:

```bash
# Install dependencies
npm install

# Development server (Turbopack, port 9002)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint (Next.js ESLint)
npm run lint

# Type check without emitting
npm run typecheck
```

### Build Configuration (`next.config.ts`)
- TypeScript errors are **ignored during builds** (`ignoreBuildErrors: true`).
- ESLint errors are **ignored during builds** (`ignoreDuringBuilds: true`).
- PWA generation is **disabled in development** (`disable: process.env.NODE_ENV === "development"`).
- PWA assets are emitted to `public/`.
- Images are allowed from `placehold.co` only.

---

## Code Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Main dashboard ('use client')
│   ├── layout.tsx          # Root layout with ThemeProvider, Inter font, PWA meta
│   ├── globals.css         # Tailwind directives + CSS variables + safe-area utilities
│   ├── login/page.tsx      # Stub — redirects to /
│   ├── register/page.tsx   # Stub — redirects to /
│   ├── forgot-password/page.tsx   # Stub — redirects to /
│   └── update-password/page.tsx   # Stub — redirects to /
│
├── components/
│   ├── app/                # Application-specific components
│   │   ├── Header.tsx      # Sticky app bar with currency selector
│   │   ├── Footer.tsx      # Action bar with export/import
│   │   ├── AddExpenseSheet.tsx      # Bottom sheet on mobile
│   │   ├── AddSavingsGoalSheet.tsx  # Bottom sheet on mobile
│   │   ├── AddFundsToGoalSheet.tsx  # Bottom sheet on mobile
│   │   ├── ExpenseChart.tsx         # Recharts donut with ResizeObserver
│   │   ├── ExpenseList.tsx
│   │   ├── ExpenseListItem.tsx      # Category accent stripe + icon circle
│   │   ├── SavingsGoalList.tsx
│   │   ├── SavingsGoalItem.tsx      # Progress bar with percentage
│   │   ├── SetThresholdDialog.tsx
│   │   ├── ThemeToggleButton.tsx    # Animated sun/moon toggle
│   │   ├── DeleteExpenseDialog.tsx
│   │   ├── DeleteSavingsGoalDialog.tsx
│   │   └── ImportInfoDialog.tsx
│   └── ui/                 # shadcn/ui primitive components (30+)
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── sheet.tsx
│       ├── toast.tsx
│       └── ... (see components.json for full list)
│
├── hooks/
│   ├── use-toast.ts        # Toast state manager
│   └── use-mobile.tsx      # useIsMobile() — 768px breakpoint
│
├── lib/
│   ├── localStore.ts       # CRUD for localStorage (expenses, goals, settings)
│   ├── sampleData.ts       # Seeds sample data for first-time users
│   └── utils.ts            # cn(), getCurrencySymbol(), formatCurrency() via Intl
│
└── types/
    └── index.ts            # Core TypeScript interfaces and constants
```

### Path Aliases
Configured in `tsconfig.json` and `components.json`:
- `@/*` → `./src/*`
- `@/components` → `src/components`
- `@/components/ui` → `src/components/ui`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`

---

## Data Layer & State Management

### Persistence: `localStorage`
All application state is stored in the browser via `src/lib/localStore.ts`.

**Keys:**
- `budgetflow_profileSettings` — `{ budget_threshold, selected_currency }`
- `budgetflow_expenses` — `Expense[]`
- `budgetflow_savingsGoals` — `SavingsGoal[]`

**Guest user ID:** `'guest-user'`

**UUID generation:** `crypto.randomUUID()` (browser native)

**Date handling:** Dates are serialized to ISO strings in storage and parsed back with `date-fns/parseISO` on load.

### Main Page State (`src/app/page.tsx`)
The root page is a `'use client'` component that holds all global state:
- `expenses` / `savingsGoals` arrays
- `userProfileSettings` (currency + budget threshold)
- Month/year filter selectors
- Sheet/dialog open/close flags
- Selected pie-chart category filter
- Guest warning visibility

Heavy components (Sheets, Charts, Dialogs) are loaded via `next/dynamic` with `ssr: false` to reduce initial bundle size and avoid hydration mismatches.

---

## Component Patterns

### Form Validation
All data entry sheets use:
- `react-hook-form` for form state
- `zod` schemas for validation
- `@hookform/resolvers` to bridge them
- shadcn/ui `<Form>` primitives for consistent markup

Example schema from `AddExpenseSheet.tsx`:
```ts
const expenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required').max(100),
  category: z.enum(EXPENSE_CATEGORIES),
  date: z.date(),
});
```

### Theming
- Dark/light mode via `next-themes` with `attribute="class"`.
- `suppressHydrationWarning` is set on `<html>` to avoid mismatch warnings.
- Tailwind `darkMode: ['class']` is configured.
- **Safe area utilities:** `.safe-area-inset-bottom` and `.safe-area-inset-top` for notched devices.

### Currency
Supported currencies are hardcoded in `src/types/index.ts`:
`USD`, `EUR`, `GBP`, `JPY`, `INR`.
Formatting is done via `formatCurrency()` in `src/lib/utils.ts` using `Intl.NumberFormat` with fallback.

---

## Testing Strategy

**There is no testing framework configured.**
- No Jest, Vitest, Playwright, or Cypress configs.
- No `.test.` or `.spec.` files exist.
- `/coverage` is in `.gitignore`, but no test runner is present.

If you add tests, the conventional locations would be:
- Unit tests: co-located with source files or in `__tests__/` directories.
- E2E tests: `e2e/` or `tests/` at project root.

---

## Deployment

### Target Platform: Firebase App Hosting
- `apphosting.yaml` is present at project root.
- `maxInstances: 1` is configured (intentionally limited).

### PWA Manifest
- `public/manifest.json` defines the app as installable.
- `public/icons/budgetflow-logo.png` is the app icon.
- Theme color: `#64B5F6` (light) / `#26292B` (dark).
- Background color: `#F0F4F7`.

### Vercel Analytics
- `@vercel/analytics` and `@vercel/speed-insights` are injected in `layout.tsx`.
- These are passive and do not affect functionality.

---

## Code Style Guidelines

1. **TypeScript:** Strict mode is enabled (`"strict": true`). Use explicit types for function parameters and return values.
2. **Imports:** Use path aliases (`@/components`, `@/lib`, etc.). Group imports: React/Next first, then third-party, then local aliases.
3. **Components:** Use functional components. shadcn/ui components are the canonical primitive layer — prefer them over raw HTML.
4. **Styling:** Use Tailwind utility classes. For conditional classes, use the `cn()` utility from `@/lib/utils` (combines `clsx` + `tailwind-merge`).
5. **Forms:** Always validate with Zod and wire through `react-hook-form`.
6. **Dates:** Use `date-fns` for all date manipulation. Store as ISO strings; render with `format()`.
7. **Icons:** Use `lucide-react` exclusively.
8. **Colors:** The design system uses HSL CSS variables defined in `globals.css` and mapped in `tailwind.config.ts`. Primary brand color is soft blue `#64B5F6`; accent is muted orange `#FFAB40`.

---

## Security Considerations

- **No auth:** The app trusts the browser entirely. Do not assume user identity.
- **LocalStorage is unencrypted:** Sensitive financial data is stored in plaintext in the browser.
- **CSV Import:** The parser accepts multiple date formats (`yyyy-MM-dd`, `MM/dd/yyyy`, `dd/MM/yyyy`, `yyyy/MM/dd`). Validate and sanitize any changes to CSV parsing to avoid injection or malformed data issues.
- **Build ignores type/lint errors:** `next.config.ts` suppresses both. Do not rely on build-time checks to catch all issues — run `npm run typecheck` and `npm run lint` before committing.

---

## Known Gaps & Stubs

When modifying code, be aware these features are incomplete:

| Feature | Status | Location |
|---------|--------|----------|
| Authentication | Stub — redirects to home | `src/app/login/page.tsx`, `register/page.tsx`, etc. |
| Recurring Expenses | Stub — returns `null` | `src/components/app/RecurringExpense*.tsx` |
| Backend / Cloud Sync | Removed | Ghosts in git history only |

If re-implementing auth or backend sync, the canonical pattern would be:
1. Replace `localStore.ts` calls with a real API client or Firebase/SQL client.
2. Restore auth pages with actual forms.
3. Replace `guest-user` IDs with real user IDs.

---

## External Resources

- **shadcn/ui docs:** https://ui.shadcn.com/docs
- **Next.js docs:** https://nextjs.org/docs
- **Tailwind docs:** https://tailwindcss.com/docs
- **Firebase App Hosting:** https://firebase.google.com/docs/app-hosting
- **Design blueprint:** `docs/blueprint.md`

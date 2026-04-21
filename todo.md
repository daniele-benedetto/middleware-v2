# Sprint: Dev Experience & Quality (Professional Setup)

Obiettivo: portare il progetto a uno standard professionale con qualità automatica, fix rapidi e workflow consistente tra team, CI e editor.

## 1) ESLint professionale

- [x] Consolidare config ESLint per Next.js + TypeScript + import order.
- [x] Aggiungere regole stricter su errori frequenti (unused vars, no-explicit-any controllato, no-floating-promises dove utile).
- [x] Abilitare `--max-warnings=0` nello script lint CI.
- [x] Definire script `lint:fix` per auto-fix locale.

## 2) Formatter / Beautifier

- [x] Introdurre Prettier con config esplicita (`.prettierrc` + `.prettierignore`).
- [x] Aggiungere plugin Prettier per sorting/import o usare ESLint-only strategy (scegliere una sola fonte di verità).
- [x] Definire script `format` e `format:check`.
- [x] Garantire compatibilità ESLint + Prettier (no conflitti di regole).

## 3) Husky + lint-staged

- [x] Installare Husky e bootstrap hook git.
- [x] Configurare `pre-commit` con `lint-staged` per file modificati:
- [x] - ESLint auto-fix
- [x] - Prettier write
- [x] - opzionale: `tsc --noEmit` solo su pre-push (non su commit)
- [x] Configurare `pre-push` con quality gate minimo (`lint` + `tsc` + build veloce se sostenibile).

## 4) Auto-resolve e auto-fix errori

- [x] Definire policy: prima auto-fix (`lint:fix`, `format`), poi check bloccanti.
- [x] Aggiungere script orchestrato `check:all` (lint, typecheck, prisma validate, build).
- [x] Aggiungere script `fix:all` (format + lint:fix) per recovery rapido.
- [x] Documentare flusso standard: `fix:all` -> `check:all` -> commit.

## 5) VS Code professional config

- [x] Creare `.vscode/settings.json` con:
- [x] - `editor.formatOnSave: true`
- [x] - `editor.codeActionsOnSave` (`source.fixAll.eslint`, `source.organizeImports`)
- [x] - formatter predefinito coerente con il repo
- [x] - validazione ESLint su TS/TSX
- [x] Creare `.vscode/extensions.json` con estensioni raccomandate (ESLint, Prettier, Prisma).
- [x] Creare `.vscode/tasks.json` per shortcut (`lint`, `typecheck`, `prisma:validate`).

## 6) CI Quality Gate

- [x] Aggiungere workflow GitHub Actions (`.github/workflows/ci.yml`).
- [x] Eseguire in CI: install, lint, typecheck, prisma validate, build.
- [x] Bloccare merge in caso di warning/error se policy strict.
- [x] Cache pnpm e dipendenze per build ripetibili e veloci.

## 7) Convenzioni operative team

- [x] Definire naming policy commit e branch.
- [x] Definire checklist PR minima (schema change, migration, docs, rollback note).
- [x] Definire policy su migration Prisma in produzione (`migrate deploy` in CI/CD).
- [x] Documentare tutto in `README.md` e/o `AGENTS.md`.

## Definition of Done

- [x] Ogni salvataggio file applica format + fix lint automatici.
- [x] Ogni commit passa hook locale senza interventi manuali ripetitivi.
- [x] CI blocca codice non conforme.
- [x] Setup editor e quality tooling replicabile da zero in <10 minuti.

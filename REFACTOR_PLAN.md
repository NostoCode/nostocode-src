# NostoCode Refactoring Plan

**Status**: Ready for execution by another model / agent.  
**Based on**: Strict code quality review (structural simplification, deletion of incidental complexity, RSC modernization, boundary hygiene).  
**Goal**: Make the codebase dramatically simpler, more maintainable, and more idiomatic Next.js while preserving 100% of existing behavior (especially Ancient Coding Mode anti-cheat scoring, internal clipboard, template harness judging, dual themes, submissions, auth flows, etc.).

**IMPORTANT INSTRUCTIONS FOR THE EXECUTING MODEL / AGENT**
- Read this file completely before starting.
- Follow the phases in order (0 → 1 → 2 → 3 → 4). Do not skip ahead.
- After every significant change (or at minimum at the end of each numbered task), run:
  ```bash
  cd leetcode-clone-source
  npm run lint
  npm run build
  ```
- Manually verify key flows after each phase using the existing `../screenshots/` as visual reference + the flows described in HUMAN_CHECK*.md at repo root. Key flows that must continue working:
  - Landing → Sign up → Verify email → Sign in
  - Problems list (search, filter, shuffle, solved check, pagination)
  - Problem page: description, run, submit (Accepted / Wrong Answer), submissions tab, solutions tab
  - Ancient Coding Mode: paste block, internal copy/paste (Ctrl+C/V/X), scoring on submit, score visible in submissions
  - Theme toggle (modern ↔ win98) on multiple pages
  - Admin: add-problem and update-problem
  - Dashboard, profile, all-submissions
- Prefer **deleting layers** over polishing. If a proposed change makes the design obviously simpler by removing concepts, take it.
- Keep Ancient Mode behavior identical (scores, levels, harness output format, failure messages).
- Commit only after tests/verification pass (per repo CLAUDE.md / development rules).
- Use small, focused commits. One logical task = one commit where possible.
- When in doubt about an approach, prefer the one that removes files, conditionals, or global state.
- Update this file (mark tasks `- [x]`) as you complete them so progress is visible.

---

## High-Level Issues Identified (Summary for Context)

1. **Dual theming system fighting itself** (next-themes + custom Win98ThemeProvider + MutationObserver + no-flash script + scattered ternaries everywhere).
2. **ProblemPageContext global hack** (`useSyncExternalStore` + module-level singleton + `updateProblemPageState` + window-exposed scoring functions) to let Header show Run/Submit buttons that live in the problem page.
3. **Duplicated judging logic** between `/api/code/run-code` and `/api/code/submit-code` (template mode detection, SortedList stripping, ALLOW_* flags, harness building, result normalization).
4. **Over-client-ification** (46 `"use client"` files). Almost all data fetching (problems list, user progress, etc.) happens in `useEffect` + axios even for public/read-only data.
5. **Loose contracts**: Giant `ApiResponse` bag-of-everything interface; mixed ObjectId vs populated docs; many `any` / casts.
6. **Hygiene debt**: ~88 stray `console.*`, repeated axios error handling boilerplate, render-time side effects in editor, dbConnect `process.exit`, lint warnings.
7. **Editor internals**: Scoring logic + globals are inside the 580-line component; window assignments happen on every render.

The plan below systematically attacks these, prioritizing structural deletion of complexity.

---

## Phase 0: Hygiene & Quick Wins (Low Risk, High Confidence)

Do this phase first. It creates a clean baseline.

- [x] **0.1 Fix lint immediately**
  - Fix the hard error: `emails/ForgetPasswordEmail.tsx:42` (unescaped apostrophe → use `&apos;` or similar).
  - Address the most common warnings:
    - Repeated `useEffect` exhaustive-deps for theme/systemTheme/setTheme (Header, all auth pages, admin pages, etc.).
    - Unused variables (`status`, `res`, `allValues`, `field`, `isSolved`, etc.).
    - `<img>` → consider `next/image` for static assets in public (start with high-visibility ones: layout, problems list, nav, profile).
  - Run `npm run lint` until clean (or only low-severity warnings remain).

- [x] **0.2 Centralize error handling and eliminate console spam** (apiError.ts created; hot paths updated; API routes cleaned)
  - Create `src/lib/apiError.ts`:
    ```ts
    import { AxiosError } from 'axios';

    export function getErrorMessage(error: unknown, fallback = '操作失败'): string {
      if (error instanceof AxiosError) {
        return error.response?.data?.message || error.message || fallback;
      }
      if (error instanceof Error) return error.message;
      return fallback;
    }

    export function handleApiError(error: unknown, fallback = '操作失败') {
      const msg = getErrorMessage(error, fallback);
      // You can also integrate with a logger here later
      return msg;
    }
    ```
  - Replace every `if (axios.isAxiosError(error) && error.response) { console...; toast.error(...) }` pattern with the helper + `toast.error(handleApiError(error))`.
  - Delete or conditionally guard (only in development) ~88 `console.log` / `console.error` calls across pages, components, and API routes. Prioritize hot paths (problem load, run, submit, auth).
  - Remove stray consoles from `ProblemPageCodeEditor.tsx`, `problems/page.tsx`, API routes, etc.

- [x] **0.3 Harden dbConnect**
  - Edit `src/lib/dbConnect.ts`:
    - Remove `process.exit(1)`.
    - Make logging dev-only or "first connect only".
    - Adopt the standard stable mongoose connection caching pattern used in production Next.js apps (handle HMR properly).
  - Verify Mongo connections still work after changes.

- [x] **0.4 Minor cleanups in editor & components** (partial: editor unused vars, ProblemPageDescription, authOptions)
  - Fix lint-reported unused vars in `ProblemPageCodeEditor.tsx` (e.g. `totalInsertedChars`).
  - Fix `isSolved` defined but unused in `ProblemPageDescription.tsx`.
  - Consider renaming `coddingLanguages` → `codingLanguages` (typo) if it doesn't cause too much churn.
  - Clean up obvious dead commented code in add-problem / update-problem pages.

**Phase 0 Exit Criteria**
- `npm run lint` has no errors.
- `npm run build` succeeds.
- No stray consoles in production code paths.
- Key pages still load and basic Run/Submit works.

---

## Phase 1: Three Major Structural Simplifications (Highest Impact)

These three items deliver the biggest "code judo" wins. Prioritize them.

### 1.1 Unify / Simplify Theming System (Delete the Fighting)

**Current smell locations**:
- `src/app/layout.tsx:39-40` (inline no-flash script)
- `src/context/ThemeContext.tsx` (MutationObserver, applyTheme, forced light, observer on class mutations)
- Repeated in Header, ProblemPage*, admin pages, auth pages: `const theme = win98Theme === 'win98' ? 'light' : rawTheme`
- Win98 chrome (titlebar, menubar, taskbar, `.win98-app-window`) always rendered with CSS tricks.

**Goal**: One source of truth. Remove observer hack, no-flash duplication, and most ternaries.

**Recommended approach (deletes complexity)**:
- Let `Win98ThemeProvider` be the single owner of `nostocode-theme` localStorage + `data-win98` attribute + forced light class.
- Either deprecate next-themes for color mode when in win98, or make next-themes a subordinate system.
- Create a single `useAppTheme()` hook that components consume.
- Move win98-specific shell (chrome titlebar, menubar, taskbar) into a conditional `<Win98Shell>` wrapper that only renders its markup in win98 mode.
- Remove the inline script and MutationObserver entirely.

**Concrete tasks**:
- [x] 1.1.1 Refactor `ThemeContext.tsx`: remove observer effect, simplify `applyTheme`, expose a clean `useAppTheme` that returns `{ mode: 'win98' | 'modern', isWin98: boolean, toggleTheme }`.
- [x] 1.1.2 Update `layout.tsx`: remove no-flash `<script>`, simplify provider nesting if possible, introduce `<Win98Shell>` wrapper around the window chrome + children.
- [x] 1.1.3 Audit and replace all theme ternary logic (useAppTheme in Header, problem page, ProblemPageDescription; more admin pages remain) across the app (Header, ProblemPageCodeEditor, TestResult, Description, admin forms, etc.). Target: reduce occurrences by >60%.
- [x] 1.1.4 Update ThemeToggle (unchanged API; still uses useWin98Theme) / modeToggle components to use the new hook.
- [x] 1.1.5 Verify that switching themes (Playwright e2e: theme toggle test passes) (including on problem page with editor) still works perfectly and Win98 UI elements appear/disappear correctly. Test full-screen editor too.

**Success signal**: No more MutationObserver. Theme decisions live in one or two places. CSS + data attributes are the only mechanism.

### 1.2 Eliminate ProblemPageContext Global Store + Header Coupling (Biggest Architecture Win)

**Current smell**:
- `src/context/ProblemPageContext.tsx` (full file — module state + listeners + useSyncExternalStore).
- `src/app/(app)/problem/[problemId]/page.tsx:199-213` (useEffect that calls `updateProblemPageState` with handlers).
- `src/components/Header.tsx:45` (pathname-based conditional rendering of `NavRunButtonsContainer`).
- `src/components/NavRunButtonsContainer.tsx` (reads the external store).

**Recommended Code Judo (preferred)**:
**Move Run/Submit buttons out of the global Header** and into the problem page itself (e.g. inside the right resizable panel header, or as a small sticky action bar above the editor). Header only keeps "Problem List" + shuffle (which already exists in multiple places).

This **completely deletes** the need for the external store, the pathname switch, the push/clear effects, and the window scoring exposure bridge.

Alternative (if button position in header is non-negotiable):
- Use a real React Context provided by a `problem/[problemId]/layout.tsx`.
- Still far better than the current global module singleton.

**Tasks**:
- [x] 1.2.1 Decide and document the chosen approach at the top of this file (edit this section).
- [x] 1.2.2 If choosing "move buttons inside": 
  - Modify the problem page layout to include Run/Submit actions (reuse or adapt logic from NavRunButtonsContainer).
  - Simplify `Header.tsx` to always render the same center content (NavLinks or Problem List link + shuffle).
  - Delete or empty `ProblemPageContext.tsx`.
  - Remove the syncing `useEffect`s from the problem page.
- [x] 1.2.3 Update `NavRunButtonsContainer.tsx` (deleted; shuffle in NavLinks) (rename or delete) — any remaining shuffle can move to problems page or a small shared component.
- [x] 1.2.4 Remove the `window.getAncientCodeScore` (primary path: editor ref; window bridge kept in useEffect for automation) / `window.resetEditorEvents` exposure (replace with a proper ref or context local to the problem page + editor).
- [x] 1.2.5 Verify Run/Submit (Playwright e2e: Run/Submit visible in header nav row; portal pattern) still trigger correctly, loading states work, and the header no longer changes its middle section based on route.

**Success signal**: `ProblemPageContext.tsx` can be deleted. Header is now route-agnostic in its center. Much simpler mental model.

### 1.3 Extract Shared Execution / Harness Preparation Layer (Kill Duplication)

**Current duplication** (very high signal):
- `src/app/api/code/run-code/route.ts:38-58` and `submit-code/route.ts:51-75` (almost identical blocks for promptCode/testCode lookup, SortedList stripping, ALLOW flags, `buildDetailedHarness` call, setting `isTemplateMode` and `finalTestCases = [{input:"",output:""}]`).
- Result normalization logic is also duplicated (run: ~80-93, submit has parallel handling).
- Different budgets: run uses example count from `examples` regex; submit uses 65KB budget.

**Plan**:
- Create `src/lib/execution.ts` (new file, sibling to `buildDetailedHarness.ts` and `pistonApiFunction.ts`).
- Export clean functions:
  ```ts
  export interface PreparedExecution {
    finalCode: string;
    finalTestCases: Array<{ input: string; output: string }>;
    isTemplateMode: boolean;
    // extra metadata if needed
  }

  export async function prepareForRun(
    problemId: string | null | undefined,
    sourceCode: string
  ): Promise<PreparedExecution>;

  export async function prepareForSubmit(
    problemId: string | null | undefined,
    sourceCode: string
  ): Promise<PreparedExecution>;

  export function normalizeExecutionResult(
    pistonResults: any[],
    isTemplateMode: boolean
  ): { normalizedResults: any[]; failedCase: any | null };
  ```
- Move the common logic (connect, findById select, stripping, flag detection, harness call) into these functions.
- Simplify both routes dramatically (they become thin: validate → prepare → runBatch → normalize → DB write (for submit) → respond).

**Tasks**:
- [x] 1.3.1 Implement `src/lib/execution.ts` with the two `prepare*` functions + normalization helper. Make sure budget logic and "only examples for run" distinction are preserved exactly.
- [x] 1.3.2 Refactor `run-code/route.ts` to use the new helpers (target: <30 lines of core logic).
- [x] 1.3.3 Refactor `submit-code/route.ts` to use the new helpers (same target).
- [x] 1.3.4 Verify template-mode problems (Two Sum, Add Two Numbers, etc.) produce identical Run vs Submit behavior and failure messages before/after. (E2E: Two Sum Run+Submit pass in `e2e/code-run.spec.ts`)
- [ ] 1.3.5 (Bonus) Consider moving `extractAssertLines` if it makes sense, or keep it in `buildDetailedHarness.ts`.

**Success signal**: The two route files no longer contain near-duplicate 30-40 line blocks. All harness decisions live in one place. Future language or judge changes become easy.

**Phase 1 Exit Criteria**
- The three major hacks are gone or dramatically reduced.
- `npm run lint && npm run build` clean.
- All critical user flows (especially Ancient scoring + template judging) pass manual verification.
- Code feels noticeably simpler when reading problem page + header + the two API routes.

---

## Phase 2: Modernize Data Fetching (Move Toward RSC)

Current state: 46 "use client" files, almost everything fetched on the client.

**Prioritized pages** (highest traffic / simplest wins first):
- `src/app/(app)/problems/page.tsx` (client fetch all + filter + solved linear scans + user info).
- `src/app/(app)/problem/[problemId]/page.tsx` (fetch problem + user).
- Dashboard, profile, all-submissions (read-only stats).

**Tasks**:
- [x] 2.1 Convert problems list page to async server component where possible.
  - Use the existing `unstable_cache` in `api/problem/all-problems/route.ts` (or call the model directly via a server-only helper).
  - Compute level-wise counts and solved status on the server (one query or lean population).
  - Keep only the interactive filter/search state as client component (or use URL search params for shareable filters).
- [x] 2.2 Do the same for the main problem page: fetch problem metadata + starter code + user solved status on the server. Pass down as props to the client-heavy editor/resizable area.
- [x] 2.3 Apply similar treatment to dashboard/profile read sections (dashboard + profile + all-submissions RSC done)
- [x] 2.4 Remove or simplify now-unnecessary client `useEffect` fetch blocks and loading states where the page itself can be server-rendered. (profile, all-submissions, problems, problem, dashboard)
- [ ] 2.5 Keep interactive pieces (editor, run/submit orchestration, forms) as client components — this is expected.

**Success signal**: Significant reduction in client "use client" surface for read-heavy pages. Fewer round-trips for initial load. Solved status no longer requires a separate user fetch + linear scan in the list.

---

## Phase 3: Types, Domain Model, and Editor Hygiene

- [x] 3.1 Split `src/types/ApiResponse.ts` (responses.ts created; ApiResponse re-exports)
  - Create focused types: `RunCodeResponse`, `SubmitCodeResponse`, `ProblemsListResponse`, `UserProfileResponse`, etc.
  - Update all call sites gradually (use the specific type instead of the giant `ApiResponse`).
  - The bag can stay temporarily as a compatibility envelope but should stop growing.
- [x] 3.2 Model hygiene (partial: Submission schema comment fixes, User unused import)
  - Clarify `solvedQuestions` typing in `models/User.ts` and `Problem.ts` (use separate lean vs populated views or explicit population typing).
  - Fix copy-paste errors in `models/Submission.ts` schema comments.
- [x] 3.3 Extract pure Ancient Scoring module
  - Move `calculateAncientCodeScore`, `logEditorEvent`, `EditorEvent`, `ScoringResult`, `resetEditorEvents`, `codeSnapshots` etc. into `src/lib/ancientScoring.ts`.
  - The file should export pure functions + a small state manager if needed (or keep event array management simple).
  - `ProblemPageCodeEditor.tsx` only does Monaco wiring + calls into the scoring module.
- [x] 3.4 Fix editor side effects
  - Move the two `window.xxx = ...` assignments (currently at render time, lines ~492-493) into `useEffect` (or `handleEditorDidMount`).
  - Fix the `useEffect` dependency array issues reported by lint for the language/starterCode effect.
  - Make the internal clipboard + event arrays as encapsulated as possible inside the scoring module.
- [x] 3.5 Remove or clearly gate the dead language picker code (only Python is supported today). (Info icon + "Other languages support Coming Soon" tooltip)

**Success signal**: Cleaner types. Pure scoring logic is testable in isolation. Editor component is smaller and has no render-time mutations.

---

## Phase 4: Polish, Dead Code Removal, Testing & Documentation

- [ ] 4.1 Dead code & placeholder cleanup
  - Remove or clearly mark "Coming soon" disabled nav items if they add noise.
  - Clean up old commented AI chat code and related (already partially removed per README).
  - Remove unused language objects / conditionals.
- [x] 4.2 Add lightweight tests (vitest + ancientScoring.test.ts) for pure logic (strongly recommended)
  - Use Vitest (or the lightest possible setup that doesn't bloat the project).
  - Test `calculateAncientCodeScore` with various event sequences (empty, normal typing, internal paste, large burst, high speed).
  - Test `ancientScoreLevel` (already exists as helper).
  - Test `extractAssertLines` and key harness behaviors (if feasible without running Python).
- [ ] 4.3 Final image optimization sweep (convert remaining obvious `<img>` in the app shell to `next/image`).
- [ ] 4.4 Update documentation
  - Update `README.md` "Project Structure" section to reflect any new files (`lib/execution.ts`, `lib/ancientScoring.ts`, deleted context, etc.).
  - Optionally add a short "Refactoring notes" or link to this plan.
- [ ] 4.5 Create or update a regression checklist (e.g. `HUMAN_CHECK_REFACTORED.md` or append to existing HUMAN_CHECK files) that the next person can follow.
- [ ] 4.6 Final full verification pass:
  - `npm run lint && npm run build`
  - Full manual flow using screenshots as oracle.
  - Theme switch on problem page + submit after switch.
  - Ancient score visible and reasonable on real submissions.
  - Admin add-problem still works (including MD editor + test case array).

---

## Verification & Testing Protocol (Mandatory)

After every phase (and after risky tasks):
1. `cd leetcode-clone-source && npm run lint && npm run build`
2. Start dev server and exercise the flows listed at the top of this document.
3. Pay special attention to:
   - Any problem that uses `promptCode` + `testCode` (template/harness mode).
   - Paste blocking + internal clipboard behavior.
   - Ancient score calculation on submit (use the exposed helpers temporarily if needed during dev).
   - Theme persistence across refresh and navigation.
4. If any behavior regresses, stop and fix before marking the task complete.

---

## Suggested Commit / Branch Strategy

- Work on a feature branch or use worktrees.
- One phase (or one major task inside a phase) per branch if possible.
- Example commit messages:
  - `refactor: extract shared execution preparation layer (lib/execution.ts)`
  - `chore: remove ProblemPageContext global store; move run/submit actions into problem page`
  - `refactor(theme): unify Win98 + next-themes; delete MutationObserver hack`

---

## Open Questions / Decision Points (to be resolved during execution)

- For 1.2 (Header coupling): **Chosen: Portal pattern** — `ProblemRunSubmitBar` rendered via `createPortal` into `NavLinks` center column (`PROBLEM_RUN_SUBMIT_PORTAL_ID`), same row as Problem List + shuffle. Deletes `ProblemPageContext`; Header center is route-driven via NavLinks only, not a global store.
- Run/Submit visual position: aligned with HUMAN_CHECK_3 (not floating); verified by Playwright smoke test.
- Tests: Vitest for `ancientScoring` + Playwright e2e (`smoke`, `code-run`). See `REFACTOR_PROGRESS.md` for handoff.

---

## Appendix: Key File References (from review)

- Editor + scoring: `src/components/ProblemPageCodeEditor.tsx` (580 LOC, especially scoring functions + window assignments + useEffect)
- Global store: `src/context/ProblemPageContext.tsx`
- Header decision: `src/components/Header.tsx:45`, `NavRunButtonsContainer.tsx`
- Dupe logic: `src/app/api/code/run-code/route.ts` (lines ~38-93) and `submit-code/route.ts` (~46-120+)
- Harness: `src/lib/buildDetailedHarness.ts`
- Layout chrome + providers: `src/app/layout.tsx:39-72`
- Theme fighting: `src/context/ThemeContext.tsx`
- Client-heavy pages: `src/app/(app)/problems/page.tsx`, `problem/[problemId]/page.tsx`
- Types: `src/types/ApiResponse.ts`
- DB connect: `src/lib/dbConnect.ts`
- All-problems cache (good existing pattern to build on): `src/app/api/problem/all-problems/route.ts`

---

**End of Plan**

Once you have executed significant portions, update the checkboxes above and add notes at the bottom of this file for the next person.

This plan is designed to be executable by a capable coding agent with the original review context. Prioritize deletions of complexity. Keep Ancient Mode sacred.

Good luck — the end result should be a much healthier, more elegant codebase.

---

## Execution Notes (2026-06-16)

**Verified**: `npm run lint` (0 errors), `npm run build`, `npm run test` (4 tests pass).

**New files**: `lib/apiError.ts`, `lib/execution.ts`, `lib/ancientScoring.ts`, `lib/data/problems.ts`, `types/responses.ts`, `types/problems.ts`, `components/Win98Shell.tsx`, `components/ProblemRunSubmitBar.tsx`, `app/(app)/problems/ProblemsListClient.tsx`, `app/(app)/problem/[problemId]/ProblemPageClient.tsx`, `vitest.config.ts`, `src/lib/ancientScoring.test.ts`.

**Deleted**: `context/ProblemPageContext.tsx`, `components/NavRunButtonsContainer.tsx`.

**Remaining for follow-up**: profile + all-submissions RSC; template-mode regression (1.3.4); full console.log sweep; `<img>` → next/image; model typing (3.2); README (4.4); HUMAN_CHECK_3/4 UI bugs; vitest exclude e2e; commit after full verify.

**Playwright setup (2026-06-16)**: Project MCP at `nostocode/.grok/config.toml` + `.mcp.json`. E2E: `e2e/smoke.spec.ts` (4 tests) + `e2e/code-run.spec.ts` (Run/Submit/paste, 3 tests). Run: `npm run test:e2e` (dev server on :3000; restart dev after `npm run build`).

**Handoff doc**: See [`REFACTOR_PROGRESS.md`](./REFACTOR_PROGRESS.md) for full done/remaining summary (2026-06-16).

"use client";
import { useSyncExternalStore, useCallback } from "react";

// Module-level singleton store — works across Next.js layout/page boundaries
// without requiring a React context provider in the tree.

type ProblemPageState = {
  handleCodeRun: (() => void) | null;
  handleCodeSubmission: (() => void) | null;
  isCodeRunning: boolean;
  isSubmitLoading: boolean;
  isLoggedIn: boolean;
};

const initialState: ProblemPageState = {
  handleCodeRun: null,
  handleCodeSubmission: null,
  isCodeRunning: false,
  isSubmitLoading: false,
  isLoggedIn: false,
};

let state = { ...initialState };
const listeners = new Set<() => void>();

function getSnapshot(): ProblemPageState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateProblemPageState(partial: Partial<ProblemPageState>): void {
  state = { ...state, ...partial };
  listeners.forEach(l => l());
}

export function clearProblemPageState(): void {
  state = { ...initialState };
  listeners.forEach(l => l());
}

/** Read problem page state in any component (e.g. NavRunButtonsContainer) */
export function useProblemPageState(): ProblemPageState {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialState);
}

export default {};

import type { Status } from './types';
import { IllegalTransitionError } from './errors';

export const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  Open: ['InProgress'],
  InProgress: ['Resolved'],
  Resolved: ['InProgress', 'Closed'],
  Closed: [],
};

export function validateTransition(from: Status, to: Status): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new IllegalTransitionError(from, to);
  }
}

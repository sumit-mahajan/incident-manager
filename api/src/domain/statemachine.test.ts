import { describe, it, expect } from 'vitest';
import { validateTransition } from './statemachine';
import { IllegalTransitionError } from './errors';

describe('validateTransition — legal transitions', () => {
  it('Open → InProgress', () => {
    expect(() => validateTransition('Open', 'InProgress')).not.toThrow();
  });

  it('InProgress → Resolved', () => {
    expect(() => validateTransition('InProgress', 'Resolved')).not.toThrow();
  });

  it('Resolved → InProgress (reopen)', () => {
    expect(() => validateTransition('Resolved', 'InProgress')).not.toThrow();
  });

  it('Resolved → Closed', () => {
    expect(() => validateTransition('Resolved', 'Closed')).not.toThrow();
  });
});

describe('validateTransition — illegal transitions', () => {
  it('Open → Resolved', () => {
    expect(() => validateTransition('Open', 'Resolved')).toThrow(IllegalTransitionError);
  });

  it('Open → Closed', () => {
    expect(() => validateTransition('Open', 'Closed')).toThrow(IllegalTransitionError);
  });

  it('InProgress → Open', () => {
    expect(() => validateTransition('InProgress', 'Open')).toThrow(IllegalTransitionError);
  });

  it('InProgress → Closed', () => {
    expect(() => validateTransition('InProgress', 'Closed')).toThrow(IllegalTransitionError);
  });

  it('Closed → Open', () => {
    expect(() => validateTransition('Closed', 'Open')).toThrow(IllegalTransitionError);
  });

  it('Closed → InProgress', () => {
    expect(() => validateTransition('Closed', 'InProgress')).toThrow(IllegalTransitionError);
  });

  it('Closed → Resolved', () => {
    expect(() => validateTransition('Closed', 'Resolved')).toThrow(IllegalTransitionError);
  });

  it('error message names the illegal pair', () => {
    expect(() => validateTransition('Open', 'Closed')).toThrow('Cannot transition from Open to Closed');
  });
});

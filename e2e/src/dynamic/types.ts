/** What the DOM reader extracts for each form control. */
export interface FieldDescriptor {
  /** Run-scoped handle stamped onto the element (data-dyn-id). */
  dynId: string;
  kind: 'text' | 'email' | 'password' | 'tel' | 'numeric' | 'date' | 'choice';
  tag: string;
  ariaLabel: string | null;
  /** Visible text next to the control that isn't linked to it. */
  visualLabel: string | null;
  placeholder: string | null;
  testId: string | null;
  name: string | null;
  inputMode: string | null;
  maxLength: number | null;
  options: string[];
}

/** The best human-readable name we found, and where it came from. */
export function displayLabel(d: FieldDescriptor): { text: string; from: 'aria' | 'visual' | 'placeholder' | 'none' } {
  if (d.ariaLabel) return { text: d.ariaLabel, from: 'aria' };
  if (d.visualLabel) return { text: d.visualLabel, from: 'visual' };
  if (d.placeholder) return { text: d.placeholder, from: 'placeholder' };
  return { text: '', from: 'none' };
}

export type ResolutionSource = 'catalog' | 'fuzzy' | 'semantic' | 'type' | 'unresolved';

export interface Resolution {
  key: string | null;
  source: ResolutionSource;
  confidence: number;
  signature: string;
  /** Why the resolver chose this, for the field report. */
  reason: string;
}

export interface FieldOutcome {
  descriptor: FieldDescriptor;
  label: string;
  labelFrom: string;
  resolution: Resolution;
  value: string | null;
  /** A selector a human could commit, instead of the run-scoped handle. */
  suggestedSelector: string;
  error: string | null;
}

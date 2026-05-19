export type ProgressionGenre = 'trap' | 'urban' | 'rnb';

export interface Progression {
  id: string;
  name: string;
  category: ProgressionGenre;
  subcategory: string;
  romanNumerals: string[];
  chordCount: number;
  mood: string;
  bpm: { min: number; max: number; default: number };
  examples: string[];
  recommendedPatterns: string[];
  recommendedStructures: string[];
}

export interface ChordPattern {
  id: string;
  name: string;
  category: 'sustained' | 'syncopated' | 'drill' | 'rnb';
  complexity: number;
  description: string;
  steps: number[];
  barsPerHit: number;
  special?: 'anticipation' | 'arpeggio';
  anticipationSteps?: number;
  arpeggioPattern?: string[];
  shortAttack?: boolean;
  fillOnly?: boolean;
  breathBeforeNext?: boolean;
}

export interface Structure {
  id: string;
  name: string;
  description: string;
  complexity: number;
  durationsInSteps: Record<string, number[]>;
  specialBehavior?: 'patternSwitchAtHalf';
}

export type KeyMode = 'major' | 'minor';

export interface ChordEvent {
  stepGlobal: number;
  notes: string[];
  durationSteps: number;
  isArpeggioNote?: boolean;
}

export interface GeneratedProgression {
  symbols: string[];
  voicings: string[][]; // notes with octaves, after voice leading
  events: ChordEvent[];
  totalSteps: number;
}

export interface Step {
  active: boolean;
  ghost: boolean;
}

export type LanePattern = Step[];

export interface LaneDef {
  id: string;
  name: string;
  defaultName: string;
  midiNote: number;
  sampleUrl: string | null;
  sampleName: string | null;
  volumeDb: number;
  muted: boolean;
  soloed: boolean;
}

export type StepCount = 16 | 32;

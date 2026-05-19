import { create } from 'zustand';
import type {
  GeneratedProgression,
  KeyMode,
  LaneDef,
  LanePattern,
  ProgressionGenre,
  StepCount,
  Step,
} from '../types';

interface ChordSampleInfo {
  fileName: string | null;
  rootNote: string;
  loaded: boolean;
}

interface StoreState {
  // Chord side
  chordSample: ChordSampleInfo;
  selectedProgressionId: string | null;
  currentTonic: string;
  currentMode: KeyMode;
  selectedPatternId: string | null;
  selectedStructureId: string | null;
  complexity: number;
  genreFilter: 'all' | ProgressionGenre;
  chordCountFilter: 'all' | number;
  generated: GeneratedProgression | null;
  chordVolumeDb: number;

  // Drum side
  lanes: LaneDef[];
  patterns: LanePattern[];
  stepCount: StepCount;
  drumVolumeDb: number;

  // Transport
  bpm: number;
  swing: number;
  isPlaying: boolean;
  currentStep: number; // playhead position (0..stepCount-1)
  loopLengthSteps: number;

  // setters
  setChordSampleInfo: (info: Partial<ChordSampleInfo>) => void;
  setSelectedProgression: (id: string | null) => void;
  setTonic: (tonic: string) => void;
  setMode: (mode: KeyMode) => void;
  setSelectedPattern: (id: string | null) => void;
  setSelectedStructure: (id: string | null) => void;
  setComplexity: (c: number) => void;
  setGenreFilter: (g: 'all' | ProgressionGenre) => void;
  setChordCountFilter: (n: 'all' | number) => void;
  setGenerated: (g: GeneratedProgression | null) => void;
  setChordVolumeDb: (db: number) => void;

  setLanePattern: (laneIdx: number, pattern: LanePattern) => void;
  toggleStep: (laneIdx: number, stepIdx: number) => void;
  clearLane: (laneIdx: number) => void;
  setStepCount: (s: StepCount) => void;
  setLaneName: (laneIdx: number, name: string) => void;
  setLaneSampleInfo: (laneIdx: number, sampleName: string | null, sampleUrl: string | null) => void;
  setLaneVolume: (laneIdx: number, db: number) => void;
  toggleMute: (laneIdx: number) => void;
  toggleSolo: (laneIdx: number) => void;
  setDrumVolumeDb: (db: number) => void;

  setBpm: (n: number) => void;
  setSwing: (n: number) => void;
  setIsPlaying: (b: boolean) => void;
  setCurrentStep: (n: number) => void;
  setLoopLengthSteps: (n: number) => void;
}

function makeEmptyPattern(count: StepCount): LanePattern {
  return Array.from({ length: count }, () => ({ active: false, ghost: false }));
}

const DEFAULT_LANES: LaneDef[] = [
  { id: 'kick', name: 'Kick', defaultName: 'Kick', midiNote: 36, sampleUrl: null, sampleName: null, volumeDb: 0, muted: false, soloed: false },
  { id: 'snare', name: 'Snare', defaultName: 'Snare', midiNote: 38, sampleUrl: null, sampleName: null, volumeDb: -3, muted: false, soloed: false },
  { id: 'hat', name: 'Hi-hat', defaultName: 'Hi-hat', midiNote: 42, sampleUrl: null, sampleName: null, volumeDb: -6, muted: false, soloed: false },
  { id: 'open', name: 'Open hat', defaultName: 'Open hat', midiNote: 46, sampleUrl: null, sampleName: null, volumeDb: -6, muted: false, soloed: false },
  { id: 'perc', name: 'Perc', defaultName: 'Perc', midiNote: 39, sampleUrl: null, sampleName: null, volumeDb: -3, muted: false, soloed: false },
];

const INITIAL_STEP_COUNT: StepCount = 16;

// Seed a basic trap pattern so the user sees something out of the box
function makeSeededPatterns(count: StepCount): LanePattern[] {
  const patterns = Array.from({ length: 5 }, () => makeEmptyPattern(count));
  const set = (lane: number, indices: number[], ghost?: boolean) => {
    indices.forEach((i) => {
      if (i < count) patterns[lane][i] = { active: true, ghost: !!ghost } as Step;
    });
  };
  set(0, [0, 6, 10]); // kick
  set(1, [4, 12]); // snare
  set(2, [0, 2, 4, 6, 8, 10, 12, 14]); // hats
  // perc accent
  set(4, [7]);
  return patterns;
}

export const useStore = create<StoreState>((set) => ({
  chordSample: { fileName: null, rootNote: 'C4', loaded: false },
  selectedProgressionId: 'trap-005', // i–VI–VII, Juice WRLD type — good default
  currentTonic: 'C',
  currentMode: 'minor',
  selectedPatternId: 'A2',
  selectedStructureId: 'E1',
  complexity: 40,
  genreFilter: 'all',
  chordCountFilter: 'all',
  generated: null,
  chordVolumeDb: -3,

  lanes: DEFAULT_LANES,
  patterns: makeSeededPatterns(INITIAL_STEP_COUNT),
  stepCount: INITIAL_STEP_COUNT,
  drumVolumeDb: -2,

  bpm: 130,
  swing: 25,
  isPlaying: false,
  currentStep: -1,
  loopLengthSteps: 16,

  setChordSampleInfo: (info) =>
    set((s) => ({ chordSample: { ...s.chordSample, ...info } })),
  setSelectedProgression: (id) => set({ selectedProgressionId: id }),
  setTonic: (tonic) => set({ currentTonic: tonic }),
  setMode: (mode) => set({ currentMode: mode }),
  setSelectedPattern: (id) => set({ selectedPatternId: id }),
  setSelectedStructure: (id) => set({ selectedStructureId: id }),
  setComplexity: (c) => set({ complexity: c }),
  setGenreFilter: (g) => set({ genreFilter: g }),
  setChordCountFilter: (n) => set({ chordCountFilter: n }),
  setGenerated: (g) => set({ generated: g }),
  setChordVolumeDb: (db) => set({ chordVolumeDb: db }),

  setLanePattern: (laneIdx, pattern) =>
    set((s) => ({
      patterns: s.patterns.map((p, i) => (i === laneIdx ? pattern : p)),
    })),
  toggleStep: (laneIdx, stepIdx) =>
    set((s) => ({
      patterns: s.patterns.map((p, i) => {
        if (i !== laneIdx) return p;
        const next = [...p];
        const cur = next[stepIdx];
        if (!cur.active && !cur.ghost) {
          next[stepIdx] = { active: true, ghost: false };
        } else if (cur.active && !cur.ghost) {
          next[stepIdx] = { active: true, ghost: true };
        } else {
          next[stepIdx] = { active: false, ghost: false };
        }
        return next;
      }),
    })),
  clearLane: (laneIdx) =>
    set((s) => ({
      patterns: s.patterns.map((p, i) =>
        i === laneIdx ? makeEmptyPattern(s.stepCount) : p,
      ),
    })),
  setStepCount: (sc) =>
    set((s) => ({
      stepCount: sc,
      patterns: s.patterns.map((p) => {
        if (p.length === sc) return p;
        if (p.length < sc) {
          return [...p, ...makeEmptyPattern(sc).slice(p.length)];
        }
        return p.slice(0, sc);
      }),
    })),
  setLaneName: (laneIdx, name) =>
    set((s) => ({
      lanes: s.lanes.map((l, i) => (i === laneIdx ? { ...l, name } : l)),
    })),
  setLaneSampleInfo: (laneIdx, sampleName, sampleUrl) =>
    set((s) => ({
      lanes: s.lanes.map((l, i) =>
        i === laneIdx ? { ...l, sampleName, sampleUrl } : l,
      ),
    })),
  setLaneVolume: (laneIdx, db) =>
    set((s) => ({
      lanes: s.lanes.map((l, i) => (i === laneIdx ? { ...l, volumeDb: db } : l)),
    })),
  toggleMute: (laneIdx) =>
    set((s) => ({
      lanes: s.lanes.map((l, i) => (i === laneIdx ? { ...l, muted: !l.muted } : l)),
    })),
  toggleSolo: (laneIdx) =>
    set((s) => ({
      lanes: s.lanes.map((l, i) => (i === laneIdx ? { ...l, soloed: !l.soloed } : l)),
    })),
  setDrumVolumeDb: (db) => set({ drumVolumeDb: db }),

  setBpm: (n) => set({ bpm: n }),
  setSwing: (n) => set({ swing: n }),
  setIsPlaying: (b) => set({ isPlaying: b }),
  setCurrentStep: (n) => set({ currentStep: n }),
  setLoopLengthSteps: (n) => set({ loopLengthSteps: n }),
}));

export function makeEmptyLanePattern(count: StepCount): LanePattern {
  return makeEmptyPattern(count);
}

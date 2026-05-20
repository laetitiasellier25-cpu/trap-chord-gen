import { Key, Chord, Note } from '@tonaljs/tonal';
import type { KeyMode } from '../types';

const NOTE_TO_MIDI: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

const ROMAN_DEGREE: Record<string, number> = {
  I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6,
};

const FLAT_MAP: Record<string, string> = {
  C: 'B', D: 'Db', E: 'Eb', F: 'E', G: 'Gb', A: 'Ab', B: 'Bb',
  'C#': 'C', 'D#': 'D', 'F#': 'F', 'G#': 'G', 'A#': 'A',
  Db: 'C', Eb: 'D', Gb: 'F', Ab: 'G', Bb: 'A',
};

function pcMidi(note: string): number {
  const pc = Note.pitchClass(note);
  return NOTE_TO_MIDI[pc] ?? 0;
}

function midiToNoteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}

/**
 * Resolve roman numerals to chord symbols in a given key.
 *
 * Uses Key.majorKey / Key.minorKey for the scale so that minor-mode degrees
 * (VI → Ab, VII → Bb in C minor) come out correct. The quality is derived
 * from the Roman numeral string itself: lowercase = minor, uppercase = major,
 * explicit suffixes (maj7, m7, 7, sus2) override the default quality.
 */
export function resolveProgression(
  tonic: string,
  mode: KeyMode,
  romanNumerals: string[],
): string[] {
  const scale =
    mode === 'minor'
      ? Key.minorKey(tonic).natural.scale
      : Key.majorKey(tonic).scale;

  return romanNumerals.map((numeral) => {
    const match = numeral.match(/^(b?)([IVXivx]+)(.*)/);
    if (!match) return '';
    const [, flat, romanPart, qualitySuffix] = match;
    const isLower = romanPart === romanPart.toLowerCase();
    const degree = ROMAN_DEGREE[romanPart.toUpperCase()];
    if (degree === undefined) return '';

    let root = scale[degree];
    if (!root) return '';
    if (flat) root = FLAT_MAP[Note.pitchClass(root)] ?? root;

    if (qualitySuffix === 'maj7') return `${root}maj7`;
    if (qualitySuffix === 'm7') return `${root}m7`;
    if (qualitySuffix === '7') return isLower ? `${root}m7` : `${root}7`;
    if (qualitySuffix === 'sus2') return `${root}sus2`;
    if (isLower) return `${root}m`;
    return root;
  });
}

/**
 * Build initial chord voicings around a target octave.
 * Each chord becomes notes in absolute pitch space, starting near middle range.
 */
export function buildInitialVoicing(symbol: string, baseOctave = 3): string[] {
  const chord = Chord.get(symbol);
  if (chord.empty || chord.notes.length === 0) return [];

  const rootPc = pcMidi(chord.notes[0]);
  const rootMidi = (baseOctave + 1) * 12 + rootPc; // octave 3 root = midi 48 for C

  const intervals: number[] = chord.notes.map((n: string) => {
    const pc = pcMidi(n);
    let diff = pc - rootPc;
    if (diff < 0) diff += 12;
    return diff;
  });

  // ensure ascending
  const sortedMidis: number[] = [];
  let last = rootMidi - 1;
  for (const interval of intervals) {
    let m = rootMidi + interval;
    while (m <= last) m += 12;
    sortedMidis.push(m);
    last = m;
  }

  return sortedMidis.map(midiToNoteName);
}

/**
 * Voice leading: choose inversion of the new chord that minimises the
 * total semitone movement from the previous chord's voicing.
 */
export function applyVoiceLeading(
  prevVoicing: string[],
  candidateVoicing: string[],
): string[] {
  if (!prevVoicing.length || !candidateVoicing.length) return candidateVoicing;

  const prevMidis = prevVoicing.map((n) => Note.midi(n) ?? 60);
  const candidateMidis = candidateVoicing.map((n) => Note.midi(n) ?? 60);

  // generate inversions by shifting each note up or down by an octave
  let bestVoicing = candidateMidis;
  let bestCost = scoreVoicing(prevMidis, candidateMidis);

  // try moving top notes down or bottom notes up by an octave
  for (let i = 0; i < candidateMidis.length; i++) {
    const lower = candidateMidis.map((m, idx) => (idx === i ? m - 12 : m));
    const higher = candidateMidis.map((m, idx) => (idx === i ? m + 12 : m));
    [lower, higher].forEach((v) => {
      // keep within reasonable register
      if (v.some((m) => m < 36 || m > 84)) return;
      const sorted = [...v].sort((a, b) => a - b);
      const cost = scoreVoicing(prevMidis, sorted);
      if (cost < bestCost) {
        bestCost = cost;
        bestVoicing = sorted;
      }
    });
  }

  // try a global octave shift to keep the voicing centered around the previous one
  const avgPrev = average(prevMidis);
  const avgBest = average(bestVoicing);
  if (avgBest - avgPrev > 7) {
    const shifted = bestVoicing.map((m) => m - 12);
    if (shifted.every((m) => m >= 36)) bestVoicing = shifted;
  } else if (avgPrev - avgBest > 7) {
    const shifted = bestVoicing.map((m) => m + 12);
    if (shifted.every((m) => m <= 84)) bestVoicing = shifted;
  }

  return bestVoicing.map(midiToNoteName);
}

function scoreVoicing(prev: number[], next: number[]): number {
  // sum of minimum distances from each prev note to any next note plus tonal centering
  let total = 0;
  for (const p of prev) {
    let best = Infinity;
    for (const n of next) {
      const d = Math.abs(p - n);
      if (d < best) best = d;
    }
    total += best;
  }
  return total;
}

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Build chord voicings for an entire progression with simple voice leading.
 */
export function resolveProgressionWithVoiceLeading(
  tonic: string,
  mode: KeyMode,
  romanNumerals: string[],
): { symbols: string[]; voicings: string[][] } {
  const symbols = resolveProgression(tonic, mode, romanNumerals);
  const voicings: string[][] = [];

  symbols.forEach((sym, i) => {
    const initial = buildInitialVoicing(sym, 3);
    if (i === 0) {
      voicings.push(initial);
    } else {
      voicings.push(applyVoiceLeading(voicings[i - 1], initial));
    }
  });

  return { symbols, voicings };
}

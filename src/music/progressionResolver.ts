import { Progression, Chord, Note, Key } from '@tonaljs/tonal';
import type { KeyMode } from '../types';

const NOTE_TO_MIDI: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
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

function romanDegree(rn: string): number {
  // Strip flat/sharp prefix and quality suffixes, then identify degree
  const base = rn.toLowerCase().replace(/^[b#]/, '').replace(/maj\d*|m(?=\d)|\d+|sus\d*|dim|aug/g, '');
  if (base.startsWith('vii')) return 6;
  if (base.startsWith('vi')) return 5;
  if (base.startsWith('iv')) return 3;
  if (base.startsWith('v')) return 4;
  if (base.startsWith('iii')) return 2;
  if (base.startsWith('ii')) return 1;
  return 0;
}

function minorChordSymbol(triad: string, rn: string): string {
  const rootMatch = triad.match(/^([A-G][b#]?)/);
  const root = rootMatch ? rootMatch[1] : '';
  if (!root) return triad;
  if (rn.includes('maj7')) return `${root}maj7`;
  if (/sus2/i.test(rn)) return `${root}sus2`;
  if (/sus4/i.test(rn)) return `${root}sus4`;
  if (rn.includes('m7') && !rn.includes('maj')) return `${root}m7`;
  if (rn.endsWith('7')) {
    // lowercase first letter = minor 7th, uppercase = dominant 7th
    const firstAlpha = rn.replace(/^b/, '')[0];
    return firstAlpha === firstAlpha.toLowerCase() ? `${root}m7` : `${root}7`;
  }
  return triad;
}

/**
 * Resolve roman numerals to chord symbols.
 * Tonal's Progression.fromRomanNumerals only works for major keys —
 * minor keys require manual resolution via Key.minorKey.
 */
export function resolveProgression(
  tonic: string,
  mode: KeyMode,
  romanNumerals: string[],
): string[] {
  if (mode === 'major') {
    return Progression.fromRomanNumerals(tonic, romanNumerals);
  }
  const triads = Key.minorKey(tonic).natural.triads;
  return romanNumerals.map((rn) => minorChordSymbol(triads[romanDegree(rn)] ?? '', rn));
}

/**
 * Build initial chord voicings around a target octave.
 * Each chord becomes notes in absolute pitch space, starting near middle range.
 */
export function buildInitialVoicing(symbol: string, baseOctave = 3): string[] {
  const chord = Chord.get(symbol);
  if (chord.empty || chord.notes.length === 0) return [];

  const rootPc = pcMidi(chord.notes[0]);
  const rootMidi = (baseOctave + 1) * 12 + rootPc; // octave 4 root = midi 60 for C

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
    const initial = buildInitialVoicing(sym, 4);
    if (i === 0) {
      voicings.push(initial);
    } else {
      voicings.push(applyVoiceLeading(voicings[i - 1], initial));
    }
  });

  return { symbols, voicings };
}

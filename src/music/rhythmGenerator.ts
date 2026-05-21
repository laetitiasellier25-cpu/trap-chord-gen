import type {
  ChordEvent,
  ChordPattern,
  GeneratedProgression,
  Structure,
} from '../types';

/**
 * Compute how long a note should sustain in steps based on the pattern.
 * For sustain patterns, the note plays until the next attack (or end of chord).
 * For shortAttack patterns, the note sustains only 1 step.
 */
function getSustainDuration(
  pattern: ChordPattern,
  stepInBar: number,
  remainingStepsInChord: number,
): number {
  if (pattern.shortAttack) return 1;

  // find the next active step (1) in the pattern after stepInBar
  let nextHit = -1;
  for (let i = stepInBar + 1; i < pattern.steps.length; i++) {
    if (pattern.steps[i] === 1) {
      nextHit = i;
      break;
    }
  }

  // if no further hit in the bar, sustain to the end of the chord segment
  let sustain;
  if (nextHit === -1) {
    sustain = remainingStepsInChord;
  } else {
    sustain = Math.min(nextHit - stepInBar, remainingStepsInChord);
  }

  if (pattern.breathBeforeNext) {
    sustain = Math.max(1, sustain - 1);
  }

  return Math.max(1, sustain);
}

/**
 * Build an arpeggio note ordering from a chord voicing.
 * Pattern entries: "root" -> index 0, "third" -> index 1, "fifth" -> index 2, etc.
 */
function arpeggioNote(voicing: string[], symbolName: string): string {
  // symbolName is one of "root", "third", "fifth", "seventh", "ninth"
  const map: Record<string, number> = { root: 0, third: 1, fifth: 2, seventh: 3, ninth: 4 };
  const idx = map[symbolName] ?? 0;
  return voicing[Math.min(idx, voicing.length - 1)];
}

/**
 * Generate timeline of chord events.
 */
export function generateChordTimeline(
  voicings: string[][],
  structure: Structure,
  pattern: ChordPattern,
): GeneratedProgression {
  const chordCount = voicings.length;
  const durations =
    structure.durationsInSteps[String(chordCount)] ??
    structure.durationsInSteps[String(Object.keys(structure.durationsInSteps)[0])];

  const events: ChordEvent[] = [];
  let cursor = 0;

  voicings.forEach((chordNotes, chordIndex) => {
    const chordDurationSteps = durations[chordIndex];
    if (!chordDurationSteps) return;

    // SPECIAL: arpeggio (D1) — egrene les notes selon arpeggioPattern, sur chaque hit du pattern
    if (pattern.special === 'arpeggio' && pattern.arpeggioPattern) {
      const arp = pattern.arpeggioPattern;
      const numBars = Math.ceil(chordDurationSteps / 16);
      let noteCounter = 0;
      for (let bar = 0; bar < numBars; bar++) {
        const remainingSteps = Math.min(16, chordDurationSteps - bar * 16);
        for (let step = 0; step < remainingSteps; step++) {
          if (pattern.steps[step] === 1) {
            const note = arpeggioNote(chordNotes, arp[noteCounter % arp.length]);
            events.push({
              stepGlobal: cursor + bar * 16 + step,
              notes: [note],
              durationSteps: 2,
              isArpeggioNote: true,
            });
            noteCounter++;
          }
        }
      }
      cursor += chordDurationSteps;
      return;
    }

    // SPECIAL: anticipation (B3) — the chord arrives N sixteenths BEFORE its expected downbeat
    // For the first chord (chordIndex === 0), we don't anticipate before step 0.
    if (pattern.special === 'anticipation' && pattern.anticipationSteps && chordIndex > 0) {
      const anticipation = pattern.anticipationSteps;
      events.push({
        stepGlobal: Math.max(0, cursor - anticipation),
        notes: chordNotes,
        durationSteps: chordDurationSteps,
      });
      cursor += chordDurationSteps;
      return;
    }

    // STANDARD generation
    const numBars = Math.ceil(chordDurationSteps / 16);
    for (let bar = 0; bar < numBars; bar++) {
      const remainingSteps = Math.min(16, chordDurationSteps - bar * 16);
      for (let step = 0; step < remainingSteps; step++) {
        if (pattern.steps[step] === 1) {
          const remainingInChord = chordDurationSteps - (bar * 16 + step);
          const sustain = getSustainDuration(pattern, step, remainingInChord);
          events.push({
            stepGlobal: cursor + bar * 16 + step,
            notes: chordNotes,
            durationSteps: sustain,
          });
        }
      }
    }
    cursor += chordDurationSteps;
  });

  return {
    symbols: [],
    voicings,
    events,
    totalSteps: cursor,
  };
}

/**
 * Filter patterns based on complexity slider (0-100).
 */
export function filterPatternsByComplexity(
  patterns: ChordPattern[],
  complexity: number,
): ChordPattern[] {
  let allowed: string[];
  if (complexity < 30) {
    allowed = ['A1', 'A2', 'A3', 'A4', 'D3'];
  } else if (complexity < 60) {
    allowed = ['A1', 'A2', 'A3', 'A4', 'D3', 'B1', 'B2', 'D2'];
  } else if (complexity < 80) {
    allowed = ['A1', 'A2', 'A3', 'A4', 'D3', 'B1', 'B2', 'D2', 'B3', 'B4', 'C1', 'D1'];
  } else {
    allowed = ['A1', 'A2', 'A3', 'A4', 'D3', 'B1', 'B2', 'D2', 'B3', 'B4', 'C1', 'D1', 'C2', 'C3'];
  }
  return patterns.filter((p) => allowed.includes(p.id) && !p.fillOnly);
}

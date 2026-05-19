import { Midi } from '@tonejs/midi';
import type { LaneDef, LanePattern } from '../types';

export function exportDrumsAsMidi(
  patterns: LanePattern[],
  lanes: LaneDef[],
  bpm: number,
  fileName = 'drums.mid',
) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4] });

  lanes.forEach((lane, laneIdx) => {
    const lanePattern = patterns[laneIdx];
    if (!lanePattern || lanePattern.every((s) => !s.active)) return;

    const track = midi.addTrack();
    track.name = lane.name;
    track.channel = 9; // GM drums

    const secondsPerSixteenth = 60 / bpm / 4;

    lanePattern.forEach((step, stepIdx) => {
      if (!step.active) return;
      track.addNote({
        midi: lane.midiNote,
        time: stepIdx * secondsPerSixteenth,
        duration: 0.1,
        velocity: step.ghost ? 0.47 : 0.79,
      });
    });
  });

  if (midi.tracks.length === 0) {
    throw new Error('No active drum steps to export.');
  }

  const array = midi.toArray();
  const blob = new Blob([new Uint8Array(array).buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

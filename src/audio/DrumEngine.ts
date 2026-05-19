import * as Tone from 'tone';
import type { LaneDef, LanePattern } from '../types';

interface LaneAudio {
  player: Tone.Player | null;
  gain: Tone.Gain;
  url: string | null;
}

export class DrumEngine {
  laneAudio: LaneAudio[];
  masterGain: Tone.Gain;
  scheduledIds: number[] = [];

  constructor(laneCount: number) {
    this.masterGain = new Tone.Gain(1).toDestination();
    this.laneAudio = Array.from({ length: laneCount }, () => ({
      player: null,
      gain: new Tone.Gain(1).connect(this.masterGain),
      url: null,
    }));
  }

  async loadSample(laneIdx: number, file: File): Promise<void> {
    const slot = this.laneAudio[laneIdx];
    if (!slot) return;
    if (slot.url) URL.revokeObjectURL(slot.url);
    if (slot.player) {
      slot.player.disconnect();
      slot.player.dispose();
      slot.player = null;
    }
    const url = URL.createObjectURL(file);
    slot.url = url;
    return new Promise((resolve, reject) => {
      const player = new Tone.Player({
        url,
        autostart: false,
        onload: () => resolve(),
        onerror: (err) => reject(err),
      }).connect(slot.gain);
      slot.player = player;
    });
  }

  setMasterVolume(db: number) {
    this.masterGain.gain.rampTo(Tone.dbToGain(db), 0.05);
  }

  setLaneVolume(laneIdx: number, db: number) {
    const slot = this.laneAudio[laneIdx];
    if (!slot) return;
    slot.gain.gain.rampTo(Tone.dbToGain(db), 0.03);
  }

  scheduleAll(
    lanes: LaneDef[],
    patterns: LanePattern[],
    chordLoopLengthSteps: number,
  ) {
    this.cancel();
    if (!patterns[0]) return;
    const drumLoopSteps = patterns[0].length;
    const repeats = Math.max(1, Math.ceil(chordLoopLengthSteps / drumLoopSteps));

    const anySolo = lanes.some((l) => l.soloed);

    patterns.forEach((lanePattern, laneIdx) => {
      const lane = lanes[laneIdx];
      const audio = this.laneAudio[laneIdx];
      if (!lane || !audio || !audio.player) return;
      if (lane.muted) return;
      if (anySolo && !lane.soloed) return;

      lanePattern.forEach((step, stepIdx) => {
        if (!step.active) return;
        for (let rep = 0; rep < repeats; rep++) {
          const globalStep = rep * drumLoopSteps + stepIdx;
          if (globalStep >= chordLoopLengthSteps) break;
          const id = Tone.getTransport().schedule((time) => {
            const player = audio.player;
            if (!player || !player.loaded) return;
            try {
              const baseGain = Tone.dbToGain(lane.volumeDb);
              const ghostMult = step.ghost ? 0.5 : 1;
              audio.gain.gain.setValueAtTime(baseGain * ghostMult, time);
              player.start(time);
            } catch {
              // swallow
            }
          }, `0:0:${globalStep}`);
          this.scheduledIds.push(id);
        }
      });
    });
  }

  cancel() {
    this.scheduledIds.forEach((id) => Tone.getTransport().clear(id));
    this.scheduledIds = [];
  }

  dispose() {
    this.cancel();
    this.laneAudio.forEach((slot) => {
      if (slot.player) {
        slot.player.disconnect();
        slot.player.dispose();
      }
      if (slot.url) URL.revokeObjectURL(slot.url);
      slot.gain.disconnect();
      slot.gain.dispose();
    });
    this.masterGain.disconnect();
    this.masterGain.dispose();
  }

  hasSample(laneIdx: number): boolean {
    return !!this.laneAudio[laneIdx]?.player;
  }
}

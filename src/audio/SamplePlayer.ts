import * as Tone from 'tone';
import type { ChordEvent } from '../types';

export class ChordSampler {
  sampler: Tone.Sampler | null = null;
  gain: Tone.Gain;
  part: Tone.Part | null = null;
  scheduledIds: number[] = [];
  rootNote = 'C4';
  currentUrl: string | null = null;
  loaded = false;

  constructor() {
    this.gain = new Tone.Gain(1).toDestination();
  }

  async load(file: File, rootNote = 'C4'): Promise<void> {
    if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
    if (this.sampler) {
      this.sampler.disconnect();
      this.sampler.dispose();
    }
    const url = URL.createObjectURL(file);
    this.currentUrl = url;
    this.rootNote = rootNote;
    this.loaded = false;

    return new Promise((resolve, reject) => {
      const sampler = new Tone.Sampler({
        urls: { [rootNote]: url },
        release: 1,
        attack: 0.005,
        onload: () => {
          this.loaded = true;
          resolve();
        },
        onerror: (err) => reject(err),
      }).connect(this.gain);
      this.sampler = sampler;
    });
  }

  setRootNote(rootNote: string) {
    if (!this.currentUrl) {
      this.rootNote = rootNote;
      return;
    }
    if (this.sampler) {
      this.sampler.disconnect();
      this.sampler.dispose();
    }
    this.rootNote = rootNote;
    this.loaded = false;
    const sampler = new Tone.Sampler({
      urls: { [rootNote]: this.currentUrl },
      release: 1,
      attack: 0.005,
      onload: () => {
        this.loaded = true;
      },
    }).connect(this.gain);
    this.sampler = sampler;
  }

  setVolume(db: number) {
    this.gain.gain.rampTo(Tone.dbToGain(db), 0.05);
  }

  // Use Tone.Part instead of Transport.schedule so events repeat on each transport loop
  scheduleEvents(events: ChordEvent[], totalSteps: number) {
    this.cancel();
    if (!this.sampler) return;

    const partEvents = events.map((e) => ({
      time: `0:0:${e.stepGlobal}`,
      notes: e.notes,
      durationSteps: e.durationSteps,
    }));

    this.part = new Tone.Part((time, event: { notes: string[]; durationSteps: number }) => {
      if (!this.sampler) return;
      const bpm = Tone.getTransport().bpm.value;
      const secondsPerSixteenth = 60 / bpm / 4;
      const durationSeconds = event.durationSteps * secondsPerSixteenth;
      try {
        this.sampler.triggerAttackRelease(event.notes, durationSeconds, time);
      } catch (err) {
        console.warn('[ChordSampler] triggerAttackRelease failed:', err, event.notes);
      }
    }, partEvents);

    this.part.loop = true;
    this.part.loopEnd = `0:0:${totalSteps}`;
    this.part.start(0);
  }

  cancel() {
    if (this.part) {
      this.part.stop();
      this.part.dispose();
      this.part = null;
    }
    this.scheduledIds.forEach((id) => Tone.getTransport().clear(id));
    this.scheduledIds = [];
  }

  dispose() {
    this.cancel();
    if (this.sampler) {
      this.sampler.disconnect();
      this.sampler.dispose();
      this.sampler = null;
    }
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
    this.gain.disconnect();
    this.gain.dispose();
  }
}

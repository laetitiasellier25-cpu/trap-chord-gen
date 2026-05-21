import * as Tone from 'tone';
import type { ChordEvent } from '../types';
import { DAW_MODE, sendChordToJuce } from './JuceBridge';

export class ChordSampler {
  sampler: Tone.Sampler | null = null;
  gain: Tone.Gain;
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
    // re-create sampler with new root
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

  scheduleEvents(events: ChordEvent[]) {
    this.cancel();
    if (!this.sampler) return;

    events.forEach((event) => {
      const id = Tone.getTransport().schedule((time) => {
        if (!this.sampler) return;
        const durationNotation = `${event.durationSteps}*16n`;
        try {
          this.sampler.triggerAttackRelease(event.notes, durationNotation, time);
        } catch {
          // ignore individual scheduling errors (e.g. invalid note name)
        }
        // In DAW mode, also route chords as MIDI to the JUCE host
        if (DAW_MODE) {
          const bpm = Tone.getTransport().bpm.value;
          Tone.getDraw().schedule(() => {
            sendChordToJuce(event.notes, event.durationSteps, bpm);
          }, time);
        }
      }, `0:0:${event.stepGlobal}`);
      this.scheduledIds.push(id);
    });
  }

  cancel() {
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

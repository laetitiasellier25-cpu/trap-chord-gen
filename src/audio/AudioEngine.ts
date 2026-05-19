import * as Tone from 'tone';

let started = false;

export async function ensureAudioStarted() {
  if (!started) {
    await Tone.start();
    started = true;
  }
  if (Tone.context.state !== 'running') {
    await Tone.context.resume();
  }
}

export function setBpm(bpm: number) {
  Tone.getTransport().bpm.value = bpm;
}

export function setSwing(swingPercent: number) {
  Tone.getTransport().swing = Math.max(0, Math.min(0.6, swingPercent / 100));
  Tone.getTransport().swingSubdivision = '16n';
}

export function startTransport() {
  Tone.getTransport().start();
}

export function stopTransport() {
  Tone.getTransport().stop();
  Tone.getTransport().position = 0;
}

export function setLoopEnd(steps: number) {
  Tone.getTransport().loop = true;
  Tone.getTransport().loopStart = 0;
  Tone.getTransport().loopEnd = `0:0:${steps}`;
}

export function cancelAllScheduled() {
  Tone.getTransport().cancel(0);
}

export function nowTransport() {
  return Tone.getTransport().seconds;
}

export const TonePkg = Tone;

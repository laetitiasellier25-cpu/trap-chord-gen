import { useEffect, useMemo } from 'react';
import * as Tone from 'tone';
import { ChordSampler } from '../audio/SamplePlayer';
import { DrumEngine } from '../audio/DrumEngine';
import {
  cancelAllScheduled,
  ensureAudioStarted,
  setBpm,
  setLoopEnd,
  setSwing,
  startTransport,
  stopTransport,
} from '../audio/AudioEngine';
import { useStore } from '../state/store';
import { PATTERNS, STRUCTURES, PROGRESSIONS } from '../data/progressions';
import {
  filterPatternsByComplexity,
  generateChordTimeline,
} from '../music/rhythmGenerator';
import { resolveProgressionWithVoiceLeading } from '../music/progressionResolver';

interface EngineSingleton {
  chord: ChordSampler;
  drum: DrumEngine;
  fallbackSynth: Tone.PolySynth | null;
  playheadRepeatId: number | null;
}

let singleton: EngineSingleton | null = null;

function getEngine(): EngineSingleton {
  if (!singleton) {
    singleton = {
      chord: new ChordSampler(),
      drum: new DrumEngine(5),
      fallbackSynth: null,
      playheadRepeatId: null,
    };
  }
  return singleton;
}

function getFallbackSynth(): Tone.PolySynth {
  const eng = getEngine();
  if (!eng.fallbackSynth) {
    eng.fallbackSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 1 },
    }).toDestination();
  }
  return eng.fallbackSynth;
}

async function loadChordSample(file: File, rootNote: string) {
  await ensureAudioStarted();
  const eng = getEngine();
  await eng.chord.load(file, rootNote);
  eng.chord.setVolume(useStore.getState().chordVolumeDb);
  useStore.getState().setChordSampleInfo({
    fileName: file.name,
    rootNote,
    loaded: true,
  });
}

function setChordRootNote(rootNote: string) {
  const eng = getEngine();
  eng.chord.setRootNote(rootNote);
  useStore.getState().setChordSampleInfo({ rootNote });
}

async function loadDrumSample(laneIdx: number, file: File) {
  await ensureAudioStarted();
  const eng = getEngine();
  await eng.drum.loadSample(laneIdx, file);
  eng.drum.setLaneVolume(laneIdx, useStore.getState().lanes[laneIdx].volumeDb);
  useStore.getState().setLaneSampleInfo(laneIdx, file.name, 'loaded');
}

function regenerateChords(): number {
  const state = useStore.getState();
  if (!state.selectedProgressionId) return 0;

  const prog = PROGRESSIONS.find((p) => p.id === state.selectedProgressionId);
  if (!prog) return 0;

  let patternId = state.selectedPatternId;
  if (!patternId) {
    const filtered = filterPatternsByComplexity(PATTERNS, state.complexity);
    const rec = prog.recommendedPatterns.find((id) => filtered.some((p) => p.id === id));
    patternId = rec || filtered[0]?.id || 'A2';
  }
  const pattern = PATTERNS.find((p) => p.id === patternId);

  let structureId = state.selectedStructureId;
  if (!structureId) {
    const compatible = prog.recommendedStructures.filter((sid) => {
      const s = STRUCTURES.find((st) => st.id === sid);
      return s && s.durationsInSteps[String(prog.chordCount)];
    });
    structureId = compatible[0] || 'E1';
  }
  const structure = STRUCTURES.find((s) => s.id === structureId);

  if (!pattern || !structure) return 0;

  const { voicings, symbols } = resolveProgressionWithVoiceLeading(
    state.currentTonic,
    state.currentMode,
    prog.romanNumerals,
  );

  const generated = generateChordTimeline(voicings, structure, pattern);
  generated.symbols = symbols;
  useStore.getState().setGenerated(generated);
  useStore.getState().setLoopLengthSteps(generated.totalSteps);
  return generated.totalSteps;
}

function rescheduleAll() {
  const state = useStore.getState();
  cancelAllScheduled();
  const eng = getEngine();

  const loopLength = Math.max(state.loopLengthSteps, state.stepCount);

  eng.drum.scheduleAll(state.lanes, state.patterns, loopLength);
  setLoopEnd(loopLength);
}

async function play() {
  // On mobile, call resume() synchronously BEFORE any await
  // to stay within the user gesture chain
  Tone.context.rawContext.resume().catch(() => {});

  await ensureAudioStarted();

  regenerateChords();
  rescheduleAll();

  const eng = getEngine();
  if (eng.playheadRepeatId !== null) {
    Tone.getTransport().clear(eng.playheadRepeatId);
  }

  eng.playheadRepeatId = Tone.getTransport().scheduleRepeat(
    (time) => {
      const ticks = Tone.getTransport().getTicksAtTime(time);
      const ppq = Tone.getTransport().PPQ;
      const globalStep = Math.floor((ticks / ppq) * 4);
      const st = useStore.getState();
      const uiStep = globalStep % st.stepCount;
      const loopLen = Math.max(st.loopLengthSteps, st.stepCount);
      const chordStep = globalStep % loopLen;

      // Trigger chord with sampler if loaded, otherwise fallback synth
      if (st.generated) {
        const event = st.generated.events.find((e) => e.stepGlobal === chordStep);
        if (event && event.notes.length > 0) {
          const bpm = Tone.getTransport().bpm.value;
          const dur = (event.durationSteps * 60) / (bpm * 4);
          const sampler = getEngine().chord.sampler;
          const instrument = sampler ?? getFallbackSynth();
          try {
            instrument.triggerAttackRelease(event.notes, dur, time);
          } catch (err) {
            console.warn('[chord]', err);
          }
        }
      }

      Tone.getDraw().schedule(() => {
        useStore.getState().setCurrentStep(uiStep);
      }, time);
    },
    '16n',
    0,
  );

  startTransport();
  useStore.getState().setIsPlaying(true);
}

function stop() {
  const eng = getEngine();
  stopTransport();
  if (eng.playheadRepeatId !== null) {
    Tone.getTransport().clear(eng.playheadRepeatId);
    eng.playheadRepeatId = null;
  }
  useStore.getState().setIsPlaying(false);
  useStore.getState().setCurrentStep(-1);
}

async function testSampler() {
  Tone.context.rawContext.resume().catch(() => {});
  await ensureAudioStarted();
  const eng = getEngine();
  if (!eng.chord.sampler) return 'no-sampler';
  const st = useStore.getState();
  const evCount = st.generated ? st.generated.events.length : 0;
  const firstNotes = st.generated?.events[0]?.notes?.join(',') ?? 'none';
  try {
    eng.chord.sampler.triggerAttackRelease(['C4', 'E4', 'G4'], 1, Tone.now());
    return `ok | events:${evCount} | notes0:${firstNotes}`;
  } catch (e) {
    return String(e);
  }
}

// stable API object
const ENGINE_API = {
  loadChordSample,
  setChordRootNote,
  loadDrumSample,
  regenerateChords,
  rescheduleAll,
  play,
  stop,
  testSampler,
} as const;

export type EngineAPI = typeof ENGINE_API;

export function useAudioEngine(): EngineAPI {
  // Initialize transport defaults once
  useEffect(() => {
    const { bpm, swing, chordVolumeDb, drumVolumeDb } = useStore.getState();
    setBpm(bpm);
    setSwing(swing);
    getEngine().chord.setVolume(chordVolumeDb);
    getEngine().drum.setMasterVolume(drumVolumeDb);
  }, []);

  // Reactive: BPM, swing, master volumes
  useEffect(() => {
    return useStore.subscribe((state, prev) => {
      if (state.bpm !== prev.bpm) setBpm(state.bpm);
      if (state.swing !== prev.swing) setSwing(state.swing);
      if (state.chordVolumeDb !== prev.chordVolumeDb) {
        getEngine().chord.setVolume(state.chordVolumeDb);
      }
      if (state.drumVolumeDb !== prev.drumVolumeDb) {
        getEngine().drum.setMasterVolume(state.drumVolumeDb);
      }
      // per-lane volume updates
      state.lanes.forEach((lane, i) => {
        if (prev.lanes[i] && lane.volumeDb !== prev.lanes[i].volumeDb) {
          getEngine().drum.setLaneVolume(i, lane.volumeDb);
        }
      });
    });
  }, []);

  return useMemo(() => ENGINE_API, []);
}

import { useEffect, useRef } from 'react';
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
import { PATTERNS, STRUCTURES } from '../data/progressions';
import {
  filterPatternsByComplexity,
  generateChordTimeline,
} from '../music/rhythmGenerator';
import { resolveProgressionWithVoiceLeading } from '../music/progressionResolver';
import { PROGRESSIONS } from '../data/progressions';

interface Engine {
  chord: ChordSampler;
  drum: DrumEngine;
}

let engineSingleton: Engine | null = null;

function getEngine(): Engine {
  if (!engineSingleton) {
    engineSingleton = {
      chord: new ChordSampler(),
      drum: new DrumEngine(5),
    };
  }
  return engineSingleton;
}

export function useAudioEngine() {
  const playheadRepeatId = useRef<number | null>(null);

  // Initialize transport defaults on mount
  useEffect(() => {
    const { bpm, swing } = useStore.getState();
    setBpm(bpm);
    setSwing(swing);
  }, []);

  // Wire reactive values: BPM, swing, master volumes
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
    });
  }, []);

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

    if (eng.chord.sampler && state.generated) {
      eng.chord.scheduleEvents(state.generated.events);
    }
    eng.drum.scheduleAll(state.lanes, state.patterns, loopLength);
    setLoopEnd(loopLength);
  }

  async function play() {
    await ensureAudioStarted();
    const state = useStore.getState();
    if (!state.generated && state.selectedProgressionId) {
      regenerateChords();
    }
    rescheduleAll();

    // playhead repeat
    if (playheadRepeatId.current !== null) {
      Tone.getTransport().clear(playheadRepeatId.current);
    }
    playheadRepeatId.current = Tone.getTransport().scheduleRepeat(
      (time) => {
        const ticks = Tone.getTransport().getTicksAtTime(time);
        const ppq = Tone.getTransport().PPQ;
        const step = Math.floor((ticks / ppq) * 4) % useStore.getState().stepCount;
        Tone.getDraw().schedule(() => {
          useStore.getState().setCurrentStep(step);
        }, time);
      },
      '16n',
      0,
    );

    startTransport();
    useStore.getState().setIsPlaying(true);
  }

  function stop() {
    stopTransport();
    if (playheadRepeatId.current !== null) {
      Tone.getTransport().clear(playheadRepeatId.current);
      playheadRepeatId.current = null;
    }
    useStore.getState().setIsPlaying(false);
    useStore.getState().setCurrentStep(-1);
  }

  return {
    loadChordSample,
    setChordRootNote,
    loadDrumSample,
    regenerateChords,
    rescheduleAll,
    play,
    stop,
  };
}

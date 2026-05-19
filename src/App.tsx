import { useEffect, useRef } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useStore } from './state/store';
import { SampleDropZone } from './components/chord/SampleDropZone';
import { SampleRootNotePicker } from './components/chord/SampleRootNotePicker';
import { KeySelector } from './components/chord/KeySelector';
import { ProgressionPicker } from './components/chord/ProgressionPicker';
import { DrumSequencer } from './components/drums/DrumSequencer';
import { PlayControls } from './components/shared/PlayControls';
import { MasterMix } from './components/shared/MasterMix';
import { Slider } from './components/shared/Slider';

function App() {
  const engine = useAudioEngine();
  const setBpm = useStore((s) => s.setBpm);
  const bpm = useStore((s) => s.bpm);
  const isPlaying = useStore((s) => s.isPlaying);
  const generated = useStore((s) => s.generated);
  const selectedProgressionId = useStore((s) => s.selectedProgressionId);
  const currentTonic = useStore((s) => s.currentTonic);
  const currentMode = useStore((s) => s.currentMode);

  const lastRegenKeyRef = useRef<string>('');

  // Auto-regenerate whenever inputs change (and reschedule live if playing)
  useEffect(() => {
    const key = `${selectedProgressionId}|${currentTonic}|${currentMode}`;
    if (key === lastRegenKeyRef.current) return;
    lastRegenKeyRef.current = key;
    if (selectedProgressionId) {
      engine.regenerateChords();
      if (isPlaying) engine.rescheduleAll();
    }
  }, [selectedProgressionId, currentTonic, currentMode, engine, isPlaying]);

  // Live reschedule on pattern edits
  const patterns = useStore((s) => s.patterns);
  const lanes = useStore((s) => s.lanes);
  const stepCount = useStore((s) => s.stepCount);
  useEffect(() => {
    if (isPlaying) engine.rescheduleAll();
  }, [patterns, lanes, stepCount, isPlaying, engine]);

  const handleChordParamChange = () => {
    engine.regenerateChords();
    if (isPlaying) engine.rescheduleAll();
  };

  return (
    <div className="min-h-screen text-gray-100">
      <header className="border-b border-ink-600 bg-gradient-to-r from-ink-900 via-ink-800 to-ink-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan bg-clip-text text-transparent">
              🎹 TRAP CHORD GEN
            </h1>
            <span className="text-xs text-gray-500 uppercase tracking-widest">
              trap · urban · R&B
            </span>
          </div>
          <PlayControls onPlay={engine.play} onStop={engine.stop} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* CHORDS */}
        <section className="panel">
          <h2 className="panel-title">Zone Accords</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-3">
              <SampleDropZone onSampleLoad={engine.loadChordSample} />
              <div className="flex flex-wrap gap-3">
                <SampleRootNotePicker onChange={engine.setChordRootNote} />
                <KeySelector />
              </div>
            </div>
            <div className="lg:col-span-2">
              <ProgressionPicker onChange={handleChordParamChange} />
            </div>
          </div>
          {generated && (
            <div className="mt-4 text-[11px] text-gray-500">
              Loop accord : {generated.totalSteps} steps · {generated.events.length} events
            </div>
          )}
        </section>

        {/* DRUMS */}
        <section className="panel">
          <h2 className="panel-title">Step Sequencer — Drums</h2>
          <DrumSequencer
            onSampleDrop={engine.loadDrumSample}
            onPatternChange={() => {
              if (isPlaying) engine.rescheduleAll();
            }}
          />
        </section>

        {/* TRANSPORT */}
        <section className="panel">
          <h2 className="panel-title">Transport</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <Slider
                label="BPM"
                value={bpm}
                min={60}
                max={180}
                onChange={setBpm}
                suffix=""
              />
              <p className="text-[10px] text-gray-500 mt-1">
                {bpm < 100 ? 'R&B / slow' : bpm < 140 ? 'urban / hip-hop' : 'trap / drill'}
              </p>
            </div>
            <div className="lg:col-span-2">
              <MasterMix />
            </div>
          </div>
        </section>

        <footer className="text-center text-[11px] text-gray-600 py-4">
          Tone.js · @tonaljs/tonal · @tonejs/midi · React 18 · Vite
        </footer>
      </main>
    </div>
  );
}

export default App;

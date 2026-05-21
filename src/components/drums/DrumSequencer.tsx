import { useStore } from '../../state/store';
import { DrumLane } from './DrumLane';
import { Slider } from '../shared/Slider';
import { exportDrumsAsMidi } from '../../audio/MidiExporter';
import type { StepCount } from '../../types';

interface Props {
  onSampleDrop: (laneIdx: number, file: File) => Promise<void>;
  onPatternChange: () => void;
}

export function DrumSequencer({ onSampleDrop, onPatternChange }: Props) {
  const stepCount = useStore((s) => s.stepCount);
  const setStepCount = useStore((s) => s.setStepCount);
  const swing = useStore((s) => s.swing);
  const setSwing = useStore((s) => s.setSwing);
  const lanes = useStore((s) => s.lanes);
  const patterns = useStore((s) => s.patterns);
  const bpm = useStore((s) => s.bpm);

  const handleStepCount = (sc: StepCount) => {
    setStepCount(sc);
    onPatternChange();
  };

  const handleExport = () => {
    try {
      exportDrumsAsMidi(patterns, lanes, bpm, stepCount);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur export MIDI');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Steps</span>
          <div className="flex rounded-md overflow-hidden border border-ink-500">
            {([16, 32] as const).map((n) => (
              <button
                key={n}
                onClick={() => handleStepCount(n)}
                className={`px-3 py-1 text-sm font-mono transition-colors ${
                  stepCount === n
                    ? 'bg-neon-purple text-white'
                    : 'bg-ink-700 text-gray-400 hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="w-56">
          <Slider
            label="Swing"
            value={swing}
            min={0}
            max={60}
            onChange={setSwing}
            suffix="%"
          />
        </div>

        <button onClick={handleExport} className="btn ml-auto">
          📥 Export MIDI
        </button>
      </div>

      <div className="rounded-lg border border-ink-600 bg-ink-900/60 p-3">
        {lanes.map((_, i) => (
          <DrumLane key={i} laneIdx={i} onSampleDrop={onSampleDrop} />
        ))}
      </div>

      <p className="text-[11px] text-gray-500">
        Clic case : <span className="text-gray-300">vide → plein</span> · 2e clic :{' '}
        <span className="text-gray-300">ghost (vélocité réduite)</span> · 3e clic :{' '}
        <span className="text-gray-300">off</span>. Solo override les autres lanes. Clique le nom de la lane pour la renommer.
      </p>
    </div>
  );
}

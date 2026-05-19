import { useStore } from '../../state/store';
import type { KeyMode } from '../../types';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function KeySelector() {
  const tonic = useStore((s) => s.currentTonic);
  const mode = useStore((s) => s.currentMode);
  const setTonic = useStore((s) => s.setTonic);
  const setMode = useStore((s) => s.setMode);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 uppercase tracking-wide">Tonalité</span>
      <select
        value={tonic}
        onChange={(e) => setTonic(e.target.value)}
        className="input min-w-[60px]"
      >
        {NOTES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as KeyMode)}
        className="input min-w-[80px]"
      >
        <option value="minor">minor</option>
        <option value="major">major</option>
      </select>
    </div>
  );
}

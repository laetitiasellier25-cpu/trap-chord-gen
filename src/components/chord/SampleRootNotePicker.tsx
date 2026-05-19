import { useStore } from '../../state/store';

const ROOT_NOTES: string[] = [];
['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].forEach((n) => {
  [2, 3, 4, 5].forEach((o) => ROOT_NOTES.push(`${n}${o}`));
});
ROOT_NOTES.sort((a, b) => {
  const an = parseInt(a.slice(-1), 10);
  const bn = parseInt(b.slice(-1), 10);
  if (an !== bn) return an - bn;
  return a.localeCompare(b);
});

interface Props {
  onChange: (rootNote: string) => void;
}

export function SampleRootNotePicker({ onChange }: Props) {
  const rootNote = useStore((s) => s.chordSample.rootNote);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 uppercase tracking-wide">Sample root</span>
      <select
        value={rootNote}
        onChange={(e) => onChange(e.target.value)}
        className="input min-w-[80px]"
      >
        {ROOT_NOTES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}

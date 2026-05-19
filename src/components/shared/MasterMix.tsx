import { useStore } from '../../state/store';
import { Slider } from './Slider';

export function MasterMix() {
  const chordDb = useStore((s) => s.chordVolumeDb);
  const drumDb = useStore((s) => s.drumVolumeDb);
  const setChord = useStore((s) => s.setChordVolumeDb);
  const setDrum = useStore((s) => s.setDrumVolumeDb);
  return (
    <div className="space-y-3">
      <Slider label="Chords" value={chordDb} min={-40} max={6} onChange={setChord} suffix="dB" />
      <Slider label="Drums" value={drumDb} min={-40} max={6} onChange={setDrum} suffix="dB" />
    </div>
  );
}

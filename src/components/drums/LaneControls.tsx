import { useState } from 'react';
import { useStore } from '../../state/store';
import { Slider } from '../shared/Slider';

interface Props {
  laneIdx: number;
}

export function LaneControls({ laneIdx }: Props) {
  const lane = useStore((s) => s.lanes[laneIdx]);
  const setLaneName = useStore((s) => s.setLaneName);
  const toggleMute = useStore((s) => s.toggleMute);
  const toggleSolo = useStore((s) => s.toggleSolo);
  const setLaneVolume = useStore((s) => s.setLaneVolume);
  const clearLane = useStore((s) => s.clearLane);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(lane.name);

  const commit = () => {
    setEditing(false);
    if (draftName.trim()) setLaneName(laneIdx, draftName.trim());
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="w-20 shrink-0">
        {editing ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraftName(lane.name);
                setEditing(false);
              }
            }}
            className="input w-full text-xs"
          />
        ) : (
          <button
            onClick={() => {
              setDraftName(lane.name);
              setEditing(true);
            }}
            className="text-sm font-semibold text-white truncate hover:text-neon-purple text-left w-full"
            title="Cliquer pour renommer"
          >
            {lane.name}
          </button>
        )}
      </div>

      <div className="w-28 shrink-0">
        <Slider
          value={lane.volumeDb}
          min={-40}
          max={6}
          onChange={(v) => setLaneVolume(laneIdx, v)}
          suffix="dB"
        />
      </div>

      <button
        onClick={() => toggleMute(laneIdx)}
        className={`pill ${
          lane.muted
            ? 'bg-red-500/30 border-red-400 text-white'
            : 'border-ink-500 text-gray-500 hover:text-gray-200'
        }`}
        title="Mute"
      >
        M
      </button>
      <button
        onClick={() => toggleSolo(laneIdx)}
        className={`pill ${
          lane.soloed
            ? 'bg-neon-amber/30 border-neon-amber text-white'
            : 'border-ink-500 text-gray-500 hover:text-gray-200'
        }`}
        title="Solo"
      >
        S
      </button>
      <button
        onClick={() => clearLane(laneIdx)}
        className="btn-ghost"
        title="Effacer cette lane"
      >
        ✕
      </button>
    </div>
  );
}

import { useStore } from '../../state/store';

interface Props {
  onPlay: () => void;
  onStop: () => void;
}

export function PlayControls({ onPlay, onStop }: Props) {
  const isPlaying = useStore((s) => s.isPlaying);
  return (
    <div className="flex gap-3 items-center">
      {!isPlaying ? (
        <button onClick={onPlay} className="btn-primary text-base px-6 py-3">
          ▶ PLAY
        </button>
      ) : (
        <button
          onClick={onStop}
          className="px-6 py-3 rounded-md text-base font-semibold bg-red-500 hover:bg-red-600 text-white"
        >
          ■ STOP
        </button>
      )}
    </div>
  );
}

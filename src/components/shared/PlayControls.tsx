import { useState } from 'react';
import { useStore } from '../../state/store';
import * as Tone from 'tone';

interface Props {
  onPlay: () => void;
  onStop: () => void;
}

export function PlayControls({ onPlay, onStop }: Props) {
  const isPlaying = useStore((s) => s.isPlaying);
  const [audioError, setAudioError] = useState<string | null>(null);

  const handlePlay = async () => {
    setAudioError(null);
    try {
      await onPlay();
      // Check context state after play
      setTimeout(() => {
        if (Tone.context.state !== 'running') {
          setAudioError(`Audio context: ${Tone.context.state} — essaie de cliquer Play une deuxième fois`);
        }
      }, 500);
    } catch (e) {
      setAudioError(e instanceof Error ? e.message : 'Erreur audio');
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-3 items-center">
        {!isPlaying ? (
          <button onClick={handlePlay} className="btn-primary text-base px-6 py-3">
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
        <span className={`text-xs px-2 py-1 rounded-md font-mono ${
          isPlaying ? 'text-neon-green bg-neon-green/10' : 'text-gray-500'
        }`}>
          {isPlaying ? '● PLAYING' : '○ STOPPED'}
        </span>
      </div>
      {audioError && (
        <p className="text-xs text-red-400 max-w-xs text-right">{audioError}</p>
      )}
    </div>
  );
}

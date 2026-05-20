import { useState, useEffect } from 'react';
import * as Tone from 'tone';
import { useStore } from '../../state/store';

interface Props {
  onPlay: () => void;
  onStop: () => void;
}

export function PlayControls({ onPlay, onStop }: Props) {
  const isPlaying = useStore((s) => s.isPlaying);
  const generated = useStore((s) => s.generated);
  const chordSample = useStore((s) => s.chordSample);
  const [ctxState, setCtxState] = useState('unknown');
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      try { setCtxState(Tone.context.state); } catch { setCtxState('err'); }
    }, 500);
    return () => clearInterval(id);
  }, []);

  const handlePlay = async () => {
    setLastError(null);
    try {
      await onPlay();
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
    }
  };

  const ok = ctxState === 'running';

  return (
    <div className="flex flex-col items-end gap-2">
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
      </div>

      {/* Debug panel - visible on all devices */}
      <div className="text-[10px] font-mono bg-ink-900 border border-ink-600 rounded-md px-3 py-2 space-y-0.5 min-w-[220px]">
        <div className={ok ? 'text-neon-green' : 'text-red-400'}>
          Audio ctx : {ctxState}
        </div>
        <div className={chordSample.loaded ? 'text-neon-green' : 'text-yellow-400'}>
          Sample : {chordSample.loaded ? `✓ ${chordSample.fileName}` : '✗ aucun sample chargé'}
        </div>
        <div className={generated ? 'text-neon-green' : 'text-yellow-400'}>
          Accords : {generated ? `✓ ${generated.events.length} events` : '✗ aucun accord généré'}
        </div>
        {lastError && <div className="text-red-400">Erreur : {lastError}</div>}
      </div>
    </div>
  );
}

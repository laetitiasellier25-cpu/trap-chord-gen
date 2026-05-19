import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useStore } from '../../state/store';

interface Props {
  onSampleLoad: (file: File, rootNote: string) => Promise<void>;
}

export function SampleDropZone({ onSampleLoad }: Props) {
  const chordSample = useStore((s) => s.chordSample);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setError(null);
      setLoading(true);
      try {
        await onSampleLoad(files[0], chordSample.rootNote);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    },
    [chordSample.rootNote, onSampleLoad],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.wav', '.mp3', '.ogg', '.flac', '.aiff', '.aif', '.m4a'],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`cursor-pointer rounded-lg border-2 border-dashed transition-all p-6 text-center ${
        isDragActive
          ? 'border-neon-purple bg-neon-purple/10'
          : chordSample.loaded
          ? 'border-neon-green/60 bg-neon-green/5 hover:bg-neon-green/10'
          : 'border-ink-500 bg-ink-900/40 hover:border-ink-400'
      }`}
    >
      <input {...getInputProps()} />
      {loading ? (
        <p className="text-sm text-gray-300">Chargement…</p>
      ) : chordSample.loaded && chordSample.fileName ? (
        <div>
          <p className="text-sm text-neon-green font-semibold mb-1">✓ {chordSample.fileName}</p>
          <p className="text-xs text-gray-400">
            Sample d'accord chargé. Glisse un autre fichier pour remplacer.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-2xl mb-2">🎹</p>
          <p className="text-sm font-medium text-gray-200">
            Dépose un sample mélodique ici
          </p>
          <p className="text-xs text-gray-500 mt-1">
            .wav / .mp3 — un loop de piano, pad, choeur, etc.
          </p>
        </div>
      )}
      {error && <p className="text-xs text-red-400 mt-2">⚠ {error}</p>}
    </div>
  );
}

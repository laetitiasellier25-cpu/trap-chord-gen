import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  loaded: boolean;
  sampleName: string | null;
  onDrop: (file: File) => Promise<void>;
}

export function DrumSampleDrop({ loaded, sampleName, onDrop }: Props) {
  const [loading, setLoading] = useState(false);

  const onDropCb = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setLoading(true);
      try {
        await onDrop(files[0]);
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    },
    [onDrop],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropCb,
    accept: { 'audio/*': ['.wav', '.mp3', '.ogg', '.flac', '.aiff', '.aif', '.m4a'] },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`cursor-pointer rounded-md border border-dashed px-2 py-1 text-[11px] text-center truncate transition-colors ${
        isDragActive
          ? 'border-neon-purple bg-neon-purple/10 text-white'
          : loaded
          ? 'border-neon-green/40 bg-neon-green/5 text-neon-green hover:bg-neon-green/10'
          : 'border-ink-500 text-gray-500 hover:border-ink-400 hover:text-gray-300'
      }`}
      title={sampleName || 'Drop sample'}
    >
      <input {...getInputProps()} />
      {loading ? '…' : loaded && sampleName ? `🎵 ${sampleName}` : '📁 drop sample'}
    </div>
  );
}

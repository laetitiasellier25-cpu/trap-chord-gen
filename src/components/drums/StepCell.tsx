import { memo } from 'react';
import type { Step } from '../../types';

interface Props {
  step: Step;
  stepIdx: number;
  isCurrent: boolean;
  onClick: () => void;
  color: string; // tailwind color shade e.g. 'bg-neon-purple'
}

function StepCellInner({ step, stepIdx, isCurrent, onClick, color }: Props) {
  const isDownbeat = stepIdx % 4 === 0;
  const beatGroup = Math.floor(stepIdx / 4) % 2 === 0;

  const base =
    'h-9 w-9 sm:h-10 sm:w-10 rounded-md border transition-colors flex items-center justify-center text-[10px] font-mono select-none';
  const bgIdle = beatGroup ? 'bg-ink-700' : 'bg-ink-800';
  const borderIdle = isDownbeat ? 'border-ink-400' : 'border-ink-600';

  let cls = `${base} ${bgIdle} ${borderIdle} text-gray-500 hover:bg-ink-600`;
  if (step.active && !step.ghost) {
    cls = `${base} ${color} text-white border-transparent shadow-glow`;
  } else if (step.active && step.ghost) {
    cls = `${base} ${color}/40 text-white/70 border-transparent`;
  }
  if (isCurrent) {
    cls += ' ring-2 ring-white/80 scale-105';
  }

  return (
    <button onClick={onClick} className={cls} aria-label={`Step ${stepIdx + 1}`}>
      {isDownbeat ? Math.floor(stepIdx / 4) + 1 : ''}
    </button>
  );
}

export const StepCell = memo(StepCellInner);

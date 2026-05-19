import { useStore } from '../../state/store';
import { StepCell } from './StepCell';
import { DrumSampleDrop } from './DrumSampleDrop';
import { LaneControls } from './LaneControls';

const LANE_COLORS = [
  'bg-neon-purple',
  'bg-neon-pink',
  'bg-neon-cyan',
  'bg-neon-amber',
  'bg-neon-green',
];

interface Props {
  laneIdx: number;
  onSampleDrop: (laneIdx: number, file: File) => Promise<void>;
}

export function DrumLane({ laneIdx, onSampleDrop }: Props) {
  const lane = useStore((s) => s.lanes[laneIdx]);
  const pattern = useStore((s) => s.patterns[laneIdx]);
  const currentStep = useStore((s) => s.currentStep);
  const toggleStep = useStore((s) => s.toggleStep);
  const color = LANE_COLORS[laneIdx % LANE_COLORS.length];

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-ink-700 last:border-b-0">
      <div className="w-[360px] shrink-0 flex flex-col gap-1">
        <LaneControls laneIdx={laneIdx} />
        <DrumSampleDrop
          loaded={!!lane.sampleName}
          sampleName={lane.sampleName}
          onDrop={(file) => onSampleDrop(laneIdx, file)}
        />
      </div>

      <div className="flex-1 overflow-x-auto scroll-hide">
        <div className="flex gap-1">
          {pattern.map((step, i) => (
            <StepCell
              key={i}
              step={step}
              stepIdx={i}
              isCurrent={currentStep === i}
              onClick={() => toggleStep(laneIdx, i)}
              color={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

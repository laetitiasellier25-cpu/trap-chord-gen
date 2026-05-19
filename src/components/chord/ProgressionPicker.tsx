import { useMemo } from 'react';
import { useStore } from '../../state/store';
import { PROGRESSIONS, PATTERNS, STRUCTURES } from '../../data/progressions';
import { filterPatternsByComplexity } from '../../music/rhythmGenerator';
import type { Progression } from '../../types';

interface Props {
  onChange: () => void;
}

export function ProgressionPicker({ onChange }: Props) {
  const {
    selectedProgressionId,
    genreFilter,
    chordCountFilter,
    complexity,
    selectedPatternId,
    selectedStructureId,
    setSelectedProgression,
    setGenreFilter,
    setChordCountFilter,
    setComplexity,
    setSelectedPattern,
    setSelectedStructure,
    generated,
  } = useStore();

  const filtered: Progression[] = useMemo(() => {
    return PROGRESSIONS.filter((p) => {
      if (genreFilter !== 'all' && p.category !== genreFilter) return false;
      if (chordCountFilter !== 'all' && p.chordCount !== chordCountFilter) return false;
      return true;
    });
  }, [genreFilter, chordCountFilter]);

  const current = PROGRESSIONS.find((p) => p.id === selectedProgressionId) || null;
  const availablePatterns = filterPatternsByComplexity(PATTERNS, complexity);

  const handleRandom = () => {
    if (!filtered.length) return;
    // eslint-disable-next-line react-hooks/purity -- Math.random in an event handler is intentional, not render logic
    const random = filtered[Math.floor(Math.random() * filtered.length)];
    setSelectedProgression(random.id);
    // pick a default recommended pattern that survives the complexity filter
    const rec = random.recommendedPatterns.find((id) =>
      availablePatterns.some((p) => p.id === id),
    );
    setSelectedPattern(rec || availablePatterns[0]?.id || null);
    const struct = random.recommendedStructures.find((sid) => {
      const s = STRUCTURES.find((st) => st.id === sid);
      return s && s.durationsInSteps[String(random.chordCount)];
    });
    setSelectedStructure(struct || 'E1');
    onChange();
  };

  const handleSelectProg = (id: string) => {
    setSelectedProgression(id);
    const prog = PROGRESSIONS.find((p) => p.id === id);
    if (prog) {
      const rec = prog.recommendedPatterns.find((pid) =>
        availablePatterns.some((p) => p.id === pid),
      );
      setSelectedPattern(rec || availablePatterns[0]?.id || null);
      const struct = prog.recommendedStructures.find((sid) => {
        const s = STRUCTURES.find((st) => st.id === sid);
        return s && s.durationsInSteps[String(prog.chordCount)];
      });
      setSelectedStructure(struct || 'E1');
    }
    onChange();
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide">Genre</span>
        {(['all', 'trap', 'urban', 'rnb'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGenreFilter(g)}
            className={`pill ${
              genreFilter === g
                ? 'bg-neon-purple/30 border-neon-purple text-white'
                : 'border-ink-500 text-gray-400 hover:border-ink-400'
            }`}
          >
            {g === 'rnb' ? 'R&B' : g}
          </button>
        ))}
        <span className="text-xs text-gray-400 uppercase tracking-wide ml-2">#</span>
        {(['all', 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            onClick={() => setChordCountFilter(n)}
            className={`pill ${
              chordCountFilter === n
                ? 'bg-neon-cyan/30 border-neon-cyan text-white'
                : 'border-ink-500 text-gray-400 hover:border-ink-400'
            }`}
          >
            {n}
          </button>
        ))}
        <button onClick={handleRandom} className="btn ml-auto">
          🎲 Tirer une progression
        </button>
      </div>

      {/* Progression list */}
      <div className="max-h-44 overflow-auto rounded-md border border-ink-600 bg-ink-900/40 scroll-hide">
        {filtered.length === 0 && (
          <p className="text-xs text-gray-500 p-3">Aucune progression ne correspond.</p>
        )}
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelectProg(p.id)}
            className={`w-full text-left px-3 py-2 text-sm border-b border-ink-700 last:border-b-0 transition-colors ${
              selectedProgressionId === p.id
                ? 'bg-neon-purple/20 text-white'
                : 'hover:bg-ink-700 text-gray-300'
            }`}
          >
            <div className="flex justify-between items-baseline gap-2">
              <span className="font-medium">{p.name}</span>
              <span className="text-[10px] uppercase text-gray-500">{p.category} · {p.subcategory}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.mood}</div>
          </button>
        ))}
      </div>

      {/* Active progression details */}
      {current && (
        <div className="rounded-md bg-ink-900/60 border border-ink-600 p-3 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-base font-semibold text-white">{current.name}</span>
            <span className="text-xs text-gray-500 font-mono">
              {current.romanNumerals.join(' – ')}
            </span>
          </div>
          {generated && (
            <div className="text-sm font-mono text-neon-cyan">
              {generated.symbols.join('  →  ')}
            </div>
          )}
          <div className="text-xs text-gray-400">{current.mood}</div>
          {current.examples.length > 0 && (
            <div className="text-[11px] text-gray-500">
              <span className="font-semibold text-gray-400">Ex&nbsp;:</span>{' '}
              {current.examples.slice(0, 3).join(' • ')}
            </div>
          )}
        </div>
      )}

      {/* Pattern / Structure / Complexity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
            Pattern rythmique
          </label>
          <select
            value={selectedPatternId || ''}
            onChange={(e) => {
              setSelectedPattern(e.target.value || null);
              onChange();
            }}
            className="input w-full"
          >
            <option value="">— auto —</option>
            {availablePatterns.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} — {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
            Structure
          </label>
          <select
            value={selectedStructureId || ''}
            onChange={(e) => {
              setSelectedStructure(e.target.value || null);
              onChange();
            }}
            className="input w-full"
          >
            <option value="">— auto —</option>
            {STRUCTURES.filter((s) => current ? !!s.durationsInSteps[String(current.chordCount)] : true).map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Complexité rythmique
          </span>
          <span className="text-sm font-mono text-white">{complexity}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={complexity}
          onChange={(e) => {
            setComplexity(Number(e.target.value));
            onChange();
          }}
          style={{ ['--val' as string]: `${complexity}%` } as React.CSSProperties}
          className="w-full"
        />
      </div>
    </div>
  );
}

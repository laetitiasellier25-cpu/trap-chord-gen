// When the app is embedded in the JUCE VST3 plugin (?daw=1),
// this module intercepts chord playback and fires a juce:// URL.
// JUCE's WebBrowserComponent intercepts it via pageAboutToLoad(),
// cancels the navigation (page stays), and queues MIDI notes.

export const DAW_MODE = new URLSearchParams(window.location.search).get('daw') === '1';

const PC_TO_SEMITONE: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
  E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8,
  Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

function isValidNote(name: string): boolean {
  const m = name.match(/^([A-Ga-g][#b]?)(-?\d+)$/);
  if (!m) return false;
  return PC_TO_SEMITONE[m[1]] !== undefined;
}

// durationSteps is in 16th-note steps; 1 step = (60/bpm)/4 seconds
export function sendChordToJuce(
  notes: string[],
  durationSteps: number,
  bpm: number,
): void {
  if (!DAW_MODE || notes.length === 0 || !notes.every(isValidNote)) return;

  const durationSeconds = (durationSteps * 60) / (bpm * 4);
  const url = `juce://chord?notes=${notes.join(':')}&dur=${durationSeconds.toFixed(3)}`;

  // Setting window.location.href to a juce:// URL triggers
  // pageAboutToLoad() in WKWebView (JUCE returns false → navigation cancelled,
  // page stays put). Safe to call from draw callbacks (main thread).
  window.location.href = url;
}

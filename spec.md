# Générateur de suites d'accords + Step Sequencer Trap / Urban / R&B — Spec technique

> **Pour qui :** Claude Code (et toi en relecture).
> **Objectif :** site web qui (a) génère des suites d'accords adaptées au trap / urban / R&B moderne avec un sample one-shot drag-n-droppé, (b) inclut un step sequencer 5 lanes synchronisé avec les accords pour les drums, (c) permet d'exporter les drums en MIDI.

---

## 1. Stack technique recommandée

| Couche | Choix | Pourquoi |
|---|---|---|
| Build / Framework | **Vite + React 18 + TypeScript** | Démarrage rapide, type safety pour la musique theory, HMR |
| Audio | **Tone.js (v15+)** | Standard du Web Audio. `Tone.Sampler` pour le pitch-shift des accords, `Tone.Player` pour les drums one-shots, `Tone.Transport` central pour la sync |
| Music theory | **@tonaljs/tonal** | Parse les chiffres romains, transpose, donne les notes d'un accord |
| MIDI export | **@tonejs/midi** | Lib officielle Tone.js. Sérialise en fichier .mid téléchargeable |
| Drag-n-drop | **react-dropzone** | UX standard, gère l'accessibilité |
| UI | **Tailwind CSS + shadcn/ui** (ou plain CSS modules) | Rapide à mettre en place, propre |
| State | **Zustand** (ou simple `useState` au début) | Léger pour le state audio/UI partagé |

**Pas besoin de backend.** Tout tourne côté client, samples et patterns restent locaux.

---

## 2. Architecture des dossiers

```
/src
  /audio
    AudioEngine.ts          → wrapper Tone.js (init, transport, BPM global, swing)
    SamplePlayer.ts         → Tone.Sampler pour les accords (1 sample pitché)
    DrumEngine.ts           → 5 Tone.Player pour les 5 lanes de drums
    Scheduler.ts            → planifie accords + drums sur le Transport
    MidiExporter.ts         → génère et télécharge le .mid des drums
  /music
    progressionResolver.ts  → roman numerals + tonalité → notes MIDI/Tone (tonal)
    rhythmGenerator.ts      → combine progression + structure + pattern → events accords
  /data
    progressions.json       → 20 progressions
    patterns.json           → 14 patterns rythmiques d'accords
    structures.json         → 5 structures de placement
  /components
    /chord
      SampleDropZone.tsx
      ProgressionPicker.tsx
      KeySelector.tsx
      SampleRootNotePicker.tsx
      VariationSettings.tsx
    /drums
      DrumSequencer.tsx        → la grille 5×16/32
      DrumLane.tsx             → 1 ligne (label + sample + contrôles + steps)
      StepCell.tsx             → 1 case cliquable (active / ghost / inactive)
      DrumSampleDrop.tsx       → drop zone par lane
      LaneControls.tsx         → volume / mute / solo / pitch (V2)
      SequencerControls.tsx    → swing slider, 16/32 toggle, Export MIDI btn
    /shared
      PlayControls.tsx         → play / stop global
      BPMSlider.tsx
      MasterMix.tsx            → 2 sliders : Chords vs Drums
      Playhead.tsx             → indicateur visuel du step en cours
  /hooks
    useAudioEngine.ts
    useProgressionGenerator.ts
    useDrumSequencer.ts
  /state
    store.ts                → store Zustand (progression, BPM, drum pattern, etc.)
  App.tsx
  main.tsx
```

---

## 3. Flow d'utilisation

```
1. User dépose un sample mélodique sur SampleDropZone (zone accords)
2. User dépose 5 samples drum, un par lane (kick, snare, hat, open, perc)
   → Chaque lane crée son Tone.Player en interne
3. User choisit ou tire au sort une progression d'accords
4. User clique sur les cases du step sequencer pour activer les hits drums
   (Click = hit normal, deuxième click = ghost, troisième click = off)
5. User règle :
   - BPM (80-160)
   - Tonalité
   - Complexité rythmique (accords)
   - Swing (0-60%) — affecte drums ET accords
   - Volume / mute / solo par lane
   - Master mix Chords vs Drums
6. User clique Play
   → Tone.Transport démarre
   → Accords ET drums sont schedulés sur le MÊME Transport
   → Sync parfaite, garantie par Tone.js
7. User clique "Export MIDI"
   → Génère drums.mid avec @tonejs/midi
   → Téléchargement automatique
```

---

## 4. Génération des accords

### 4.1 Roman numerals → accords concrets

```ts
import { Progression, Chord } from "@tonaljs/tonal";

const chordSymbols = Progression.fromRomanNumerals("C", ["i", "VI", "VII"]);
// → ["Cm", "Ab", "Bb"]

const chordNotes = chordSymbols.map((sym) => {
  const c = Chord.get(sym);
  return c.notes.map((n) => n + "3");
});
```

⚠️ **Cas spéciaux** : `i7`, `IVm7`, `bIIImaj7`, `i7sus2`, `bVII`, `I` borrowed major dans contexte mineur. Tester chaque cas.

### 4.2 Voice leading simple (optionnel mais conseillé)

Pour chaque accord à partir du 2e : choisir l'inversion qui minimise les sauts d'intervalles depuis l'accord précédent. Tonal a `Voicing.search()`.

### 4.3 Génération de la timeline accord

```ts
function generateLoop(progression, structureId, patternId, chordsCount) {
  const structure = structures.find(s => s.id === structureId);
  const pattern = patterns.find(p => p.id === patternId);
  const durations = structure.durationsInSteps[chordsCount];

  const events = [];
  let cursor = 0;

  durations.forEach((chordDurationSteps, chordIndex) => {
    const chordNotes = progression[chordIndex];
    const numBars = Math.ceil(chordDurationSteps / 16);
    for (let bar = 0; bar < numBars; bar++) {
      const remainingSteps = Math.min(16, chordDurationSteps - bar * 16);
      for (let step = 0; step < remainingSteps; step++) {
        if (pattern.steps[step] === 1) {
          events.push({
            stepGlobal: cursor + bar * 16 + step,
            chordNotes,
            durationSteps: getSustainDuration(pattern, step),
          });
        }
      }
    }
    cursor += chordDurationSteps;
  });

  return { events, totalSteps: cursor };
}
```

⚠️ Patterns spéciaux : `anticipation` (B3), `arpeggio` (D1), `shortAttack` (C1/C2), `breathBeforeNext` (D3). Voir `patterns.json`.

### 4.4 Slider complexité

Filtre les patterns selon `complexity` :
- 0–30 : A1, A2, A3, A4, D3
- 30–60 : + B1, B2, D2
- 60–80 : + B3, B4, C1, D1
- 80–100 : + C2, C3

---

## 5. Implémentation audio (Tone.js)

### 5.1 Chargement du sample d'accord

```ts
async function loadChordSample(file: File, rootNote = "C4") {
  const url = URL.createObjectURL(file);
  const sampler = new Tone.Sampler({
    urls: { [rootNote]: url },
    release: 1,
  }).toDestination();
  await Tone.loaded();
  return sampler;
}
```

### 5.2 Scheduling des accords

```ts
function scheduleChords(sampler, events) {
  events.forEach((event) => {
    Tone.Transport.schedule((time) => {
      sampler.triggerAttackRelease(
        event.chordNotes,
        `${event.durationSteps}*16n`,
        time
      );
    }, `0:0:${event.stepGlobal}`);
  });
}
```

### 5.3 Démarrage du Transport

```ts
async function play() {
  await Tone.start(); // OBLIGATOIRE après geste utilisateur
  Tone.Transport.start();
}
```

### 5.4 Gotchas Web Audio

⚠️ `Tone.start()` **après clic utilisateur**, jamais dans un `useEffect`.
⚠️ Toujours `Tone.Transport.schedule`, jamais `setTimeout`.
⚠️ Quand un paramètre change en live : `Tone.Transport.cancel()` + re-schedule.
⚠️ `Tone.Sampler` est polyphonique par défaut → ok pour les accords.

---

## 6. Step Sequencer (Drums) — gros bloc V1

### 6.1 Concept

Grille de **5 lanes × 16 ou 32 steps**. Chaque lane a son sample drag-n-droppé. Toutes les lanes sont schedulées sur le **même `Tone.Transport`** que les accords → sync auto.

5 lanes par défaut (toutes **renommables** en cliquant sur le label) :

| Lane | Nom par défaut | Note MIDI export (GM) |
|---|---|---|
| 1 | Kick | C1 (36) |
| 2 | Snare | D1 (38) |
| 3 | Hi-hat | F#1 (42) |
| 4 | Open hat | A#1 (46) |
| 5 | Perc | D#1 (39) — clap GM |

### 6.2 Structure de données

```ts
type Step = {
  active: boolean;
  ghost: boolean; // true = velocity réduite
};

type LanePattern = Step[]; // longueur 16 ou 32

type Lane = {
  id: string;
  name: string;
  sampleUrl: string | null;
  player: Tone.Player | null;
  gain: Tone.Gain | null; // pour gérer volume + ghost velocity
  midiNote: number;       // pour l'export MIDI
  volumeDb: number;       // -60 à 0
  muted: boolean;
  soloed: boolean;
};

type DrumState = {
  lanes: Lane[];           // longueur 5
  patterns: LanePattern[]; // longueur 5, chaque LanePattern = 16 ou 32 steps
  stepCount: 16 | 32;
};
```

### 6.3 Engine

```ts
// DrumEngine.ts
class DrumEngine {
  lanes: Lane[];
  patterns: LanePattern[];
  scheduledEventIds: number[] = [];

  loadSample(laneIndex: number, file: File) {
    // libère l'ancien sample s'il existe
    const old = this.lanes[laneIndex];
    if (old.sampleUrl) URL.revokeObjectURL(old.sampleUrl);
    if (old.player) old.player.dispose();
    if (old.gain) old.gain.dispose();

    const url = URL.createObjectURL(file);
    const gain = new Tone.Gain(1).toDestination();
    const player = new Tone.Player(url).connect(gain);

    this.lanes[laneIndex] = {
      ...old,
      sampleUrl: url,
      player,
      gain,
    };
  }

  scheduleAll(chordLoopLengthSteps: number) {
    this.cancelAll();
    const drumLoopSteps = this.patterns[0].length; // 16 ou 32

    this.patterns.forEach((lanePattern, laneIdx) => {
      const lane = this.lanes[laneIdx];
      if (!lane.player) return;

      lanePattern.forEach((step, stepIdx) => {
        if (!step.active) return;
        // Le drum loop se répète pour matcher le chord loop
        for (let rep = 0; rep * drumLoopSteps < chordLoopLengthSteps; rep++) {
          const globalStep = rep * drumLoopSteps + stepIdx;
          const id = Tone.Transport.schedule((time) => {
            if (!this.shouldPlay(laneIdx)) return;
            const baseGain = Tone.dbToGain(lane.volumeDb);
            const ghostMult = step.ghost ? 0.5 : 1;
            lane.gain.gain.setValueAtTime(baseGain * ghostMult, time);
            lane.player.start(time);
          }, `0:0:${globalStep}`);
          this.scheduledEventIds.push(id);
        }
      });
    });
  }

  shouldPlay(laneIdx: number): boolean {
    const lane = this.lanes[laneIdx];
    if (lane.muted) return false;
    const anySolo = this.lanes.some(l => l.soloed);
    if (anySolo && !lane.soloed) return false;
    return true;
  }

  cancelAll() {
    this.scheduledEventIds.forEach(id => Tone.Transport.clear(id));
    this.scheduledEventIds = [];
  }
}
```

### 6.4 Synchronisation avec les accords

Les deux sont sur le même `Tone.Transport`, donc :
- Même BPM
- Même horloge
- Le Transport boucle sur la longueur du loop accord (`totalSteps` du générateur)
- Si le drum loop est plus court (16 steps) et le chord loop plus long (ex : 64 steps), le drum loop est **rescheduled N fois** pour remplir (voir code §6.3)

```ts
function startEverything(chordEvents, chordLoopLength, drumEngine) {
  Tone.Transport.cancel();
  scheduleChords(sampler, chordEvents);
  drumEngine.scheduleAll(chordLoopLength);
  Tone.Transport.loopEnd = `0:0:${chordLoopLength}`;
  Tone.Transport.loop = true;
}
```

### 6.5 Swing global

Tone.js a un swing intégré :

```ts
Tone.Transport.swing = swingPercent / 100; // 0 à 0.6
Tone.Transport.swingSubdivision = "16n";   // swing sur les 16th
```

Ça affecte **tous** les events schedulés → groove unifié drums + accords. C'est ce qui donne le feel trap moderne sur les hats notamment.

### 6.6 Playhead visuel

Utiliser `Tone.Draw.schedule()` pour synchroniser la mise à jour UI avec l'audio (sinon dérive visible) :

```ts
Tone.Transport.scheduleRepeat((time) => {
  const stepPosition = Math.floor(
    Tone.Transport.getTicksAtTime(time) / Tone.Transport.PPQ * 4
  ) % stepCount;
  Tone.Draw.schedule(() => {
    setCurrentStep(stepPosition); // déclenche le re-render React
  }, time);
}, "16n");
```

### 6.7 Vélocité (normal / ghost)

Cycle clic : `inactive → active → ghost → inactive`
- Active : couleur pleine, velocity 1.0
- Ghost : couleur half-opacity, velocity 0.5
- Inactive : case vide

### 6.8 Export MIDI

```ts
// MidiExporter.ts
import { Midi } from "@tonejs/midi";

export function exportDrumsAsMidi(
  patterns: LanePattern[],
  lanes: Lane[],
  bpm: number,
  fileName = "drums.mid"
) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4] });

  lanes.forEach((lane, laneIdx) => {
    const lanePattern = patterns[laneIdx];
    if (lanePattern.every(s => !s.active)) return; // skip empty lanes

    const track = midi.addTrack();
    track.name = lane.name;
    track.channel = 9; // canal 10 GM (= 9 zero-indexed) = drums

    lanePattern.forEach((step, stepIdx) => {
      if (!step.active) return;
      const secondsPerSixteenth = 60 / bpm / 4;
      track.addNote({
        midi: lane.midiNote,
        time: stepIdx * secondsPerSixteenth,
        duration: 0.1,
        velocity: step.ghost ? 0.47 : 0.79, // 60/127 et 100/127
      });
    });
  });

  const array = midi.toArray();
  const blob = new Blob([array], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Choix de design pour l'export :**
- 1 track MIDI par lane (plus propre pour le DAW)
- Channel 10 (GM drums) par défaut
- BPM embarqué dans le header
- Velocity 100 (normal) / 60 (ghost)
- Durée du fichier = 1 boucle du drum pattern (16 ou 32 steps). L'utilisateur boucle dans son DAW.

---

## 7. UI / UX (proposition de layout)

```
┌─────────────────────────────────────────────────────────────┐
│  🎹 TRAP CHORD GEN                                          │
├─────────────────────────────────────────────────────────────┤
│  ZONE ACCORDS                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   📁 Drag your melodic sample here                   │   │
│  └─────────────────────────────────────────────────────┘    │
│  Sample root: [C4 ▾]   Key: [C ▾] [minor ▾]                 │
│                                                             │
│  Progression: Cm – Ab – Bb (i – VI – VII)                   │
│  Mood: Émotionnel  •  Ex: Juice WRLD – In My Head           │
│  [🎲 New]  Genre: [All|Trap|Urban|R&B]  #: [2|3|4|5]        │
│  Complexity ●━━━━○━━━━ 40                                   │
├─────────────────────────────────────────────────────────────┤
│  STEP SEQUENCER (DRUMS)                                     │
│                                                             │
│  Steps: [16 / 32]   Swing: ●━━○━━━━ 25%   [📥 Export MIDI]  │
│                                                             │
│        sample          vol  M  S  │1 . . . 2 . . . 3 . . . 4 . . .│
│  Kick  [📁 kick.wav▶ ] [━━○] [M][S] │■ . . . . . . . ■ . . . . . . . │
│  Snare [📁 snr.wav ▶ ] [━━○] [M][S] │. . . . ■ . . . . . . . ■ . . . │
│  Hat   [📁 hat.wav ▶ ] [━━○] [M][S] │■ . ■ . ■ . ■ . ■ . ■ . ■ . ■ . │
│  Open  [📁 oh.wav  ▶ ] [━━○] [M][S] │. . . . . . . ■ . . . . . . . ■ │
│  Perc  [📁 perc.wav▶ ] [━━○] [M][S] │. . . ■ . . . . . . . ■ . . . . │
│                                     ↑ colonne playhead lit-up        │
├─────────────────────────────────────────────────────────────┤
│  TRANSPORT                                                  │
│  BPM   ●━━━━━━━○━━━  120     Master:                        │
│        80           160      Chords ●━━━━━○━━  -3 dB        │
│                              Drums  ●━━━━○━━━  -2 dB        │
│                                                             │
│        [ ▶ PLAY ]      [ ■ STOP ]                           │
└─────────────────────────────────────────────────────────────┘
```

**Interactions clés** :
- Clic sur le label d'une lane (ex "Kick") → input pour renommer
- Clic sur case vide → active (couleur pleine)
- Clic sur case active → ghost (couleur half-opacity)
- Clic sur case ghost → désactivée
- La colonne du step en cours est éclairée pendant la lecture
- Boutons M/S : Mute / Solo (Solo override les autres lanes)
- Slider de volume par lane : -60 dB à 0 dB

---

## 8. Roadmap MVP → V1

### MVP (semaine 1)
- [ ] Drag-n-drop sample mélodique + Tone.Sampler
- [ ] 5 progressions hardcodées
- [ ] Slider BPM
- [ ] Play/Stop avec pattern A2 uniquement
- [ ] Affichage des notes jouées

### V1 (semaines 2-3) — inclut tout le drum sequencer
- [ ] Les 20 progressions depuis le JSON
- [ ] Filtres genre + nombre d'accords + bouton "New"
- [ ] Tous les patterns rythmiques d'accords (A à D)
- [ ] Slider complexité
- [ ] Sélecteur de tonalité (12 notes × 2 modes)
- [ ] Voice leading basique
- [ ] **Step sequencer 5 lanes × 16 steps**
- [ ] **Toggle 16 / 32 steps**
- [ ] **Drag-n-drop sample par lane**
- [ ] **Volume + Mute + Solo par lane**
- [ ] **Master mix Chords/Drums**
- [ ] **Slider swing global**
- [ ] **Vélocité 2 niveaux (normal / ghost)**
- [ ] **Playhead visuel synchronisé**
- [ ] **Renommer les lanes**
- [ ] **Export MIDI des drums** (avec `@tonejs/midi`)

### V2 (futur)
- [ ] Bibliothèque de samples par défaut
- [ ] Export MIDI des accords aussi
- [ ] Export audio (rendu WAV via `Tone.Offline`)
- [ ] Hat roll / triplet helper
- [ ] localStorage pour sauvegarder les sessions
- [ ] Pitch / tune par lane drum
- [ ] Multiple patterns / pattern banks (A/B/C/D)
- [ ] Vélocité fine (slider continu)
- [ ] Mode "chord editor" pour modifier la suite générée
- [ ] Compteur visuel piano roll qui défile

---

## 9. Pièges à éviter

1. **`Tone.start()` après geste utilisateur** (clic Play). Sinon audio bloqué.
2. **Jamais `setTimeout`** pour le timing musical. Toujours `Tone.Transport.schedule`.
3. **Octaves** : sample mélodique en C5 + demande de jouer C6 = trop aigu. Préférer transposer vers le bas.
4. **Tonal renvoie les notes sans octave** → toujours préfixer une octave.
5. **`Tone.Player` n'a pas de velocity native** → route via un `Tone.Gain` par lane, module le gain pour les ghosts.
6. **`Tone.Player.start()` ré-appelé pendant qu'il joue** → comportement à tester. Pour les drums one-shots courts, en général pas de souci.
7. **MIDI export avec lanes vides** : skip les tracks sans aucun step actif sinon fichier MIDI sale.
8. **`Tone.Transport.swing`** affecte tout. Si tu veux que seuls les hats swinguent, faut faire du custom. Pour MVP/V1 : swing global suffit.
9. **Drum loop < chord loop** : rescheduler le pattern N fois pour couvrir toute la durée du loop (voir code §6.3).
10. **Mobile Safari** : Web Audio peut se mettre en pause en arrière-plan. Re-check `Tone.context.state` au retour sur la page.
11. **Fuite mémoire samples** : à chaque `URL.createObjectURL`, faire `URL.revokeObjectURL` quand on remplace le sample. Aussi `.dispose()` sur les Tone.Player remplacés.
12. **Re-render React pendant le playhead** : ne re-render que la ligne du playhead, pas toute la grille. Utiliser `React.memo` sur `StepCell` et passer le `currentStep` via un context séparé pour éviter de rerender les 80 cellules à chaque step.

---

## 10. Données et fichiers fournis

Trois fichiers JSON dans `/src/data/` :
- `progressions.json` — 20 progressions
- `patterns.json` — 14 patterns rythmiques d'accords
- `structures.json` — 5 structures de placement

Le drum sequencer n'a **pas** de JSON de patterns (l'utilisateur les programme à la main, c'est demandé explicitement).

Les **defaults des 5 lanes** (noms, notes MIDI) sont à hardcoder, suivant le tableau en §6.1.

---

## 11. Prompt initial pour Claude Code

Voir `claude-code-prompt.md`.

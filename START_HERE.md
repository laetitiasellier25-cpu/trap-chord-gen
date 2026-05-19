# 🚀 START HERE

## Setup (3 min, puis tu laisses Claude Code bosser)

1. Mets ce dossier sur un ordi ou dans Termux Android
2. Si pas déjà fait : `npm install -g @anthropic-ai/claude-code`
3. Ouvre un terminal dans ce dossier
4. Lance : `claude`
5. Copie-colle le prompt ci-dessous, appuie Entrée
6. Va prendre un café (30–60 min selon la machine)

---

## 📋 Le prompt à copier-coller dans Claude Code

```
Salut. Tu vas construire un site web complet à partir des fichiers dans ce dossier. Procède en autonomie, ne me demande pas de validation à chaque étape.

# Étapes dans l'ordre

1. Lis spec.md en entier — c'est le brief complet
2. Valide les données :
   - npm init -y
   - npm install @tonaljs/tonal
   - node test-progressions.js
   Si warnings sur les chiffres romains : corrige data/progressions.json selon les suggestions du log, re-lance jusqu'à ce que ce soit propre

3. Initialise un projet Vite + React + TypeScript dans CE dossier (garde data/, spec.md, etc. à leur place)
4. Installe les deps : tone, @tonaljs/tonal, @tonejs/midi, react-dropzone, tailwindcss
5. Implémente la V1 COMPLÈTE (voir spec.md §8), pas seulement le MVP. Tout doit y être : générateur d'accords avec ses 20 progressions/14 patterns/5 structures, drum sequencer 5 lanes, swing, mute/solo, vélocité ghost, playhead, export MIDI.
6. Lance le serveur : npm run dev
7. Quand c'est prêt, donne-moi l'URL locale et la liste des choses à tester en priorité

# Règles

- Carte blanche pour les choix mineurs (couleurs exactes, structure de fichiers interne, lib UI si tu préfères shadcn ou autre)
- Si tu coinces : cherche dans la doc des libs, fais un choix raisonnable, continue
- Demande-moi seulement pour les VRAIS choix de design importants
- Fais un commit Git à chaque grosse étape (init / accords OK / drums OK / MIDI OK)
- Si la spec contredit le bon sens à un moment, applique le bon sens et signale-le-moi à la fin

À toi.
```

---

## Quand Claude Code te dit "c'est prêt", tu testes :

1. Drag-drop un sample piano dans la zone accords
2. Choisir une progression, appuyer Play → tu entends les accords
3. Drag-drop des samples drums dans les 5 lanes (kick, snare, hat, etc.)
4. Cliquer sur les cases pour programmer un beat → ça joue en boucle synchro
5. Bouger le slider BPM en live → tempo change immédiatement
6. Bouger le slider swing → tu sens le groove changer
7. Bouton "Export MIDI" → un fichier .mid se télécharge

---

## Si ça coince

Reviens dans la conversation Claude (mobile), envoie-moi :
- L'erreur exacte (capture d'écran ou copie du log)
- L'étape où tu es bloqué

Je débugue avec toi.

/**
 * test-progressions.js
 *
 * Vérifie que toutes les progressions de progressions.json sont parsables
 * par @tonaljs/tonal, dans plusieurs tonalités. Vérifie aussi que les
 * références entre fichiers (patterns/structures) sont cohérentes.
 *
 * USAGE :
 *   1. cd dans le dossier du projet (où se trouvent spec.md, data/, etc.)
 *   2. npm init -y
 *   3. npm install @tonaljs/tonal
 *   4. node test-progressions.js
 *
 * Sortie : un rapport détaillé qui te dit, pour chaque progression et
 * chaque tonalité testée, quels accords concrets sont générés et leurs
 * notes. Si quelque chose ne parse pas, c'est signalé avec un suggestion.
 */

const fs = require("fs");
const path = require("path");
const { Progression, Chord } = require("@tonaljs/tonal");

// ─────────────────────────────────────────────────────────────
// Chargement des fichiers de données
// ─────────────────────────────────────────────────────────────

const dataDir = path.join(__dirname, "data");
let progressions, patterns, structures;

try {
  progressions = JSON.parse(fs.readFileSync(path.join(dataDir, "progressions.json"), "utf-8"));
  patterns = JSON.parse(fs.readFileSync(path.join(dataDir, "patterns.json"), "utf-8"));
  structures = JSON.parse(fs.readFileSync(path.join(dataDir, "structures.json"), "utf-8"));
} catch (err) {
  console.error("❌ Impossible de charger les fichiers JSON :", err.message);
  console.error("   Vérifie que tu es bien dans le dossier du projet.");
  process.exit(1);
}

// Tonalités à tester : couvrent dièses, bémols, naturels
const tonicsToTest = ["C", "F#", "Eb", "A", "D"];

let totalTests = 0;
let passed = 0;
const failures = [];
const warnings = [];
const summary = [];

console.log("\n🎵 ════════════════════════════════════════════════════════");
console.log(`   Test de ${progressions.length} progressions × ${tonicsToTest.length} tonalités`);
console.log("   ════════════════════════════════════════════════════════\n");

// ─────────────────────────────────────────────────────────────
// 1. Test du parsing des chiffres romains
// ─────────────────────────────────────────────────────────────

progressions.forEach((prog) => {
  const progSummary = {
    id: prog.id,
    name: prog.name,
    roman: prog.romanNumerals,
    results: {},
  };

  tonicsToTest.forEach((tonic) => {
    totalTests++;
    try {
      const chordSymbols = Progression.fromRomanNumerals(tonic, prog.romanNumerals);

      const chordDetails = chordSymbols.map((sym) => {
        const c = Chord.get(sym);
        return {
          symbol: sym,
          notes: c.notes,
          empty: c.empty,
        };
      });

      const emptyChords = chordDetails.filter((d) => d.empty || d.notes.length === 0);
      const expectedCount = prog.romanNumerals.length;

      if (chordSymbols.length !== expectedCount) {
        failures.push({
          progression: prog.name,
          tonic,
          issue: `Nombre d'accords incorrect : attendu ${expectedCount}, obtenu ${chordSymbols.length}`,
          got: chordSymbols,
        });
        progSummary.results[tonic] = `❌ count mismatch`;
      } else if (emptyChords.length > 0) {
        warnings.push({
          progression: prog.name,
          tonic,
          issue: "Certains accords ne sont pas reconnus par tonal",
          details: chordDetails,
        });
        progSummary.results[tonic] = chordDetails
          .map((d) => (d.empty ? `❌ ${d.symbol}` : `${d.symbol}(${d.notes.join("-")})`))
          .join(" → ");
      } else {
        passed++;
        progSummary.results[tonic] = chordDetails
          .map((d) => `${d.symbol} (${d.notes.join("-")})`)
          .join(" → ");
      }
    } catch (err) {
      failures.push({
        progression: prog.name,
        tonic,
        issue: `Exception : ${err.message}`,
      });
      progSummary.results[tonic] = `❌ ${err.message}`;
    }
  });

  summary.push(progSummary);
});

// ─────────────────────────────────────────────────────────────
// 2. Affichage du résumé détaillé
// ─────────────────────────────────────────────────────────────

console.log("📊 RÉSUMÉ PAR PROGRESSION\n");
summary.forEach((s) => {
  console.log(`┌─ [${s.id}] ${s.name}`);
  console.log(`│  Chiffres romains : ${s.roman.join(" - ")}`);
  Object.entries(s.results).forEach(([tonic, result]) => {
    console.log(`│  En ${tonic.padEnd(3)} : ${result}`);
  });
  console.log("└─");
});

// ─────────────────────────────────────────────────────────────
// 3. Avertissements
// ─────────────────────────────────────────────────────────────

if (warnings.length > 0) {
  console.log("\n\n⚠️  AVERTISSEMENTS (chiffres romains à corriger)\n");
  warnings.forEach((w) => {
    console.log(`  [${w.progression}] en ${w.tonic} : ${w.issue}`);
    w.details.forEach((d) => {
      if (d.empty || d.notes.length === 0) {
        console.log(`     ❌ "${d.symbol}" → non reconnu`);
      } else {
        console.log(`     ✓  "${d.symbol}" → ${d.notes.join("-")}`);
      }
    });
    console.log("");
  });

  console.log("  💡 Suggestions de correction des chiffres romains :");
  console.log('     - "IVm7" → "iv7"  (le m7 est redondant avec la minuscule)');
  console.log('     - "bIIImaj7" en mineur naturel → "IIImaj7"  (déjà bémol)');
  console.log('     - "bVI" / "bVII" en mineur naturel → "VI" / "VII"  (déjà bémol)');
  console.log('     - "i7sus2" peut ne pas parser → essayer "i sus2" ou "i7"');
}

// ─────────────────────────────────────────────────────────────
// 4. Échecs
// ─────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.log("\n\n❌ ÉCHECS\n");
  failures.forEach((f) => {
    console.log(`  [${f.progression}] en ${f.tonic} : ${f.issue}`);
    if (f.got) console.log(`     Output : ${JSON.stringify(f.got)}`);
  });
}

// ─────────────────────────────────────────────────────────────
// 5. Vérification cross-files (patterns, structures)
// ─────────────────────────────────────────────────────────────

console.log("\n\n📋 VÉRIFICATIONS CROISÉES\n");

const allPatternIds = new Set(patterns.map((p) => p.id));
const allStructureIds = new Set(structures.map((s) => s.id));
const crossErrors = [];

progressions.forEach((prog) => {
  prog.recommendedPatterns.forEach((pid) => {
    if (!allPatternIds.has(pid)) {
      crossErrors.push(`❌ Pattern "${pid}" référencé par "${prog.name}" mais absent de patterns.json`);
    }
  });
  prog.recommendedStructures.forEach((sid) => {
    if (!allStructureIds.has(sid)) {
      crossErrors.push(`❌ Structure "${sid}" référencée par "${prog.name}" mais absente de structures.json`);
    }
  });
});

// Vérifier que chaque progression a au moins une structure compatible
progressions.forEach((prog) => {
  const compatibleStructures = prog.recommendedStructures.filter((sid) => {
    const s = structures.find((st) => st.id === sid);
    return s && s.durationsInSteps[String(prog.chordCount)];
  });
  if (compatibleStructures.length === 0) {
    crossErrors.push(
      `❌ "${prog.name}" (${prog.chordCount} accords) n'a aucune structure compatible parmi [${prog.recommendedStructures.join(", ")}]`
    );
  }
});

// Vérifier que chaque pattern a une grille de 16 steps
patterns.forEach((p) => {
  if (!Array.isArray(p.steps) || p.steps.length !== 16) {
    crossErrors.push(`❌ Pattern "${p.id}" : steps doit être un tableau de 16 éléments (actuel: ${p.steps?.length})`);
  }
  if (p.steps && p.steps.some((s) => s !== 0 && s !== 1)) {
    crossErrors.push(`❌ Pattern "${p.id}" : steps doit contenir uniquement 0 ou 1`);
  }
});

if (crossErrors.length > 0) {
  crossErrors.forEach((e) => console.log("  " + e));
} else {
  console.log("  ✓ Toutes les références patterns/structures sont valides");
  console.log("  ✓ Tous les patterns ont 16 steps de 0/1");
  console.log("  ✓ Chaque progression a au moins une structure compatible");
}

// ─────────────────────────────────────────────────────────────
// 6. Stats finales
// ─────────────────────────────────────────────────────────────

console.log("\n\n═══════════════════════════════════════════════");
console.log("                  BILAN FINAL");
console.log("═══════════════════════════════════════════════");
console.log(`  Tests parsing        : ${totalTests}`);
console.log(`  ✓ Réussis           : ${passed}`);
console.log(`  ⚠ Avertissements    : ${warnings.length}`);
console.log(`  ❌ Échecs            : ${failures.length}`);
console.log(`  Erreurs croisées     : ${crossErrors.length}`);
console.log("═══════════════════════════════════════════════\n");

const allGood = failures.length === 0 && warnings.length === 0 && crossErrors.length === 0;
if (allGood) {
  console.log("🎉 Tout est bon ! Tu peux lancer Claude Code en confiance.\n");
  process.exit(0);
} else if (failures.length === 0 && crossErrors.length === 0) {
  console.log("⚠️  Quelques accords ne parsent pas parfaitement mais ça reste utilisable.");
  console.log("   Demande à l'assistant Claude de corriger les notations en question.\n");
  process.exit(0);
} else {
  console.log("❌ Il y a des erreurs critiques à corriger avant de lancer Claude Code.");
  console.log("   Renvoie ce log à l'assistant Claude pour fixer le JSON.\n");
  process.exit(1);
}

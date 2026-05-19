import progressionsJson from '../../data/progressions.json';
import patternsJson from '../../data/patterns.json';
import structuresJson from '../../data/structures.json';
import type { Progression, ChordPattern, Structure } from '../types';

export const PROGRESSIONS = progressionsJson as Progression[];
export const PATTERNS = patternsJson as ChordPattern[];
export const STRUCTURES = structuresJson as Structure[];

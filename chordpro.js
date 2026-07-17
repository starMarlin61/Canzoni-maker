/**
 * ChordPro Parser and Transposer Module
 * Supports both Latin (Do, Re, Mi...) and English (C, D, E...) chord notations.
 */

const LATIN_SCALE = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const LATIN_SCALE_FLAT = ['Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'];

const ENGLISH_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ENGLISH_SCALE_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Map flats to sharps index for normalization
const LATIN_MAP = {
  'Do#': 1, 'Reb': 1,
  'Re#': 3, 'Mib': 3,
  'Fa#': 6, 'Solb': 6,
  'Sol#': 8, 'Lab': 8,
  'La#': 10, 'Sib': 10
};

const ENGLISH_MAP = {
  'C#': 1, 'Db': 1,
  'D#': 3, 'Eb': 3,
  'F#': 6, 'Gb': 6,
  'G#': 8, 'Ab': 8,
  'A#': 10, 'Bb': 10
};

/**
 * Normalizes and transposes a single chord string.
 * @param {string} chord - The chord to transpose (e.g., "Do", "Re#m7", "C/E", "Sol7")
 * @param {number} semitones - Number of semitones to shift (positive or negative)
 * @returns {string} The transposed chord
 */
export function transposeChord(chord, semitones) {
  if (!chord || semitones === 0) return chord;

  // Handle slash chords (e.g., C/E or Do/Mi)
  if (chord.includes('/')) {
    const parts = chord.split('/');
    return transposeChord(parts[0], semitones) + '/' + transposeChord(parts[1], semitones);
  }

  // Regex to extract root note and the modifier/suffix
  // Matches Latin: Do, Re, Mi, Fa, Sol, La, Si followed by #, b or other chars
  // Matches English: A, B, C, D, E, F, G followed by #, b or other chars
  const latinRegex = /^(Do#|Reb|Re#|Mib|Fa#|Solb|Sol#|Lab|La#|Sib|Do|Re|Mi|Fa|Sol|La|Si)(.*)$/;
  const englishRegex = /^(C#|Db|D#|Eb|F#|Gb|G#|Ab|A#|Bb|C|D|E|F|G)(.*)$/;

  let match = chord.match(latinRegex);
  if (match) {
    const root = match[1];
    const suffix = match[2];
    const transposedRoot = shiftNote(root, semitones, LATIN_SCALE, LATIN_SCALE_FLAT, LATIN_MAP);
    return transposedRoot + suffix;
  }

  match = chord.match(englishRegex);
  if (match) {
    const root = match[1];
    const suffix = match[2];
    const transposedRoot = shiftNote(root, semitones, ENGLISH_SCALE, ENGLISH_SCALE_FLAT, ENGLISH_MAP);
    return transposedRoot + suffix;
  }

  return chord; // Return as is if it doesn't match
}

function shiftNote(note, semitones, sharpScale, flatScale, aliasMap) {
  let index = sharpScale.indexOf(note);
  if (index === -1) {
    index = flatScale.indexOf(note);
  }
  if (index === -1 && aliasMap[note] !== undefined) {
    index = aliasMap[note];
  }
  if (index === -1) return note;

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  // Prefer flats if the original was a flat, otherwise prefer sharps
  const isFlat = note.endsWith('b') || note === 'Reb' || note === 'Mib' || note === 'Solb' || note === 'Lab' || note === 'Sib';
  return isFlat ? flatScale[newIndex] : sharpScale[newIndex];
}

/**
 * Parses a ChordPro text format and returns a structured array of lines.
 * Each line contains tokens (either text lyric or chord).
 * Example input: "[Do]Al[Sol]leluia"
 * Output line: [{ chord: "Do", text: "Al" }, { chord: "Sol", text: "leluia" }]
 * 
 * @param {string} text - Raw ChordPro text
 * @param {number} transpose - Semitones to transpose
 * @returns {Array<Array<{chord: string, text: string}>>}
 */
export function parseChordPro(text, transpose = 0) {
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const parsedLines = [];

  for (let rawLine of lines) {
    // Skip metadata directives like {title: ...} or {comment: ...} for chord rendering,
    // but we can parse them if needed. For now, let's treat lines starting with { as metadata or comments.
    if (rawLine.startsWith('{') && rawLine.endsWith('}')) {
      const directiveMatch = rawLine.substring(1, rawLine.length - 1).split(':');
      const key = directiveMatch[0].trim().toLowerCase();
      const value = directiveMatch.slice(1).join(':').trim();
      
      // We can push a special directive line
      parsedLines.push({
        type: 'directive',
        key: key,
        value: value,
        raw: rawLine
      });
      continue;
    }

    const lineTokens = [];
    let currentChord = '';
    let currentText = '';
    let inChord = false;

    // Check if line contains any chords. If it's a plain text line, we keep it simple.
    if (!rawLine.includes('[') && !rawLine.includes(']')) {
      parsedLines.push({
        type: 'lyric-only',
        text: rawLine
      });
      continue;
    }

    for (let i = 0; i < rawLine.length; i++) {
      const char = rawLine[i];
      if (char === '[') {
        // If we had text accumulating, push it with previous chord (if any) or empty chord
        if (currentText || currentChord) {
          lineTokens.push({
            chord: currentChord ? transposeChord(currentChord, transpose) : '',
            text: currentText
          });
          currentText = '';
        }
        inChord = true;
        currentChord = '';
      } else if (char === ']') {
        inChord = false;
      } else {
        if (inChord) {
          currentChord += char;
        } else {
          currentText += char;
        }
      }
    }

    // Push the remaining token
    if (currentText || currentChord) {
      lineTokens.push({
        chord: currentChord ? transposeChord(currentChord, transpose) : '',
        text: currentText
      });
    }

    parsedLines.push({
      type: 'chord-lyric',
      tokens: lineTokens
    });
  }

  return parsedLines;
}

/**
 * Converts parsed ChordPro lines into HTML string.
 * @param {Array} parsedLines - Parsed lines from parseChordPro
 * @returns {string} HTML Representation
 */
export function renderToHTML(parsedLines) {
  let html = '<div class="chordpro-song">';
  
  for (let line of parsedLines) {
    if (line.type === 'directive') {
      if (line.key === 'comment' || line.key === 'c') {
        html += `<div class="song-comment">${escapeHTML(line.value)}</div>`;
      } else if (line.key === 'chorus' || line.key === 'soc') {
        html += `<div class="song-chorus-start">Ritornello:</div><div class="song-chorus">`;
      } else if (line.key === 'eoc') {
        html += `</div>`;
      }
      // Other directives like title/artist are handled globally, not in the lyrics area
      continue;
    }

    if (line.type === 'lyric-only') {
      if (line.text.trim() === '') {
        html += '<div class="song-empty-line">&nbsp;</div>';
      } else {
        html += `<div class="song-line lyric-only">${escapeHTML(line.text)}</div>`;
      }
      continue;
    }

    if (line.type === 'chord-lyric') {
      html += '<div class="song-line chord-lyric">';
      for (let token of line.tokens) {
        const chordHTML = token.chord ? `<span class="chord-name">${escapeHTML(token.chord)}</span>` : '<span class="chord-name empty">&nbsp;</span>';
        const textHTML = token.text ? `<span class="lyric-text">${escapeHTML(token.text)}</span>` : '<span class="lyric-text empty">&nbsp;</span>';
        
        html += `<span class="chord-group">${chordHTML}${textHTML}</span>`;
      }
      html += '</div>';
    }
  }

  html += '</div>';
  return html;
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

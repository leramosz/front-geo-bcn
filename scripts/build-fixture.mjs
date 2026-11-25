// Convierte fonts_beure_2026.csv al formato DrinkingWaterFountain de la API v2,
// para que los tests e2e usen un mock fiel a los datos reales (1.760 fuentes).
import { readFileSync, writeFileSync } from 'node:fs';

const [, , input, output] = process.argv;
const text = readFileSync(input, 'utf8').replace(/^﻿/, '');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const [header, ...rows] = text.split(/\r?\n/).filter(Boolean);
const cols = parseCsvLine(header);
const blank = (v) => (v == null || v.trim() === '' ? null : v.trim());

const fountains = rows.map((line) => {
  const r = Object.fromEntries(parseCsvLine(line).map((v, i) => [cols[i], v]));
  const street = blank(r.CARRER);
  const number = blank(r.NUMERO_CARRER) === 'SN' ? null : blank(r.NUMERO_CARRER);
  return {
    id: r.CODI,
    name: blank(r.NOM),
    status: 'UNKNOWN',
    address: {
      street,
      street_number: number,
      formatted: street ? (number ? `${street}, ${number}` : street) : null,
    },
    location: { latitude: Number(r.LATITUD), longitude: Number(r.LONGITUD) },
    district: { id: r.CODI_DISTRICTE, name: r.NOM_DISTRICTE },
    neighbourhood: blank(r.CODI_BARRI) ? { id: r.CODI_BARRI, name: r.NOM_BARRI } : null,
  };
}).sort((a, b) => a.id.localeCompare(b.id));

writeFileSync(output, JSON.stringify(fountains));
console.log(`${fountains.length} fuentes -> ${output}`);

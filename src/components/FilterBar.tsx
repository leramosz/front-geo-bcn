import type { DistrictWithNeighbourhoods } from '../api/types';

export interface AreaSelection {
  districtId: string;
  neighbourhoodId: string;
}

interface Props {
  districts: DistrictWithNeighbourhoods[];
  value: AreaSelection;
  onChange: (value: AreaSelection) => void;
}

export function FilterBar({ districts, value, onChange }: Props) {
  const district = districts.find((d) => d.id === value.districtId);
  // Sin distrito elegido, los barrios no se ofrecen: solo los del distrito activo (CA7).
  const neighbourhoods = district?.neighbourhoods ?? [];
  const active = value.districtId !== '' || value.neighbourhoodId !== '';

  return (
    <div className="filters">
      <label>
        <span>Distrito</span>
        <select
          aria-label="Distrito"
          value={value.districtId}
          onChange={(e) => onChange({ districtId: e.target.value, neighbourhoodId: '' })}
        >
          <option value="">Todos</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Barrio</span>
        <select
          aria-label="Barrio"
          value={value.neighbourhoodId}
          disabled={!district}
          onChange={(e) => onChange({ ...value, neighbourhoodId: e.target.value })}
        >
          <option value="">Todos</option>
          {neighbourhoods.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </label>
      {active && (
        <button type="button" className="btn" onClick={() => onChange({ districtId: '', neighbourhoodId: '' })}>
          Quitar filtro
        </button>
      )}
    </div>
  );
}

/** Nombre del área activa para el contador ("N fuentes en Ciutat Vella"). */
export function areaName(districts: DistrictWithNeighbourhoods[], value: AreaSelection): string | undefined {
  const district = districts.find((d) => d.id === value.districtId);
  if (value.neighbourhoodId) {
    return district?.neighbourhoods.find((n) => n.id === value.neighbourhoodId)?.name;
  }
  return district?.name;
}

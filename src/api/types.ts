// Tipos del contrato v2 (leramosz/api-geo-bcn, openapi.yaml en develop).

export type FountainStatus = 'UNKNOWN' | 'OPERATIONAL' | 'OUT_OF_SERVICE';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface CodeName {
  id: string;
  name: string;
}

export interface FountainAddress {
  street: string | null;
  street_number: string | null;
  formatted: string | null;
}

export interface Fountain {
  id: string;
  name: string | null;
  /** Se acepta cualquier string: valores futuros del enum se tratan como UNKNOWN. */
  status: FountainStatus | string;
  address: FountainAddress;
  location: Location;
  district: CodeName;
  neighbourhood: CodeName | null;
  distance?: number;
}

export interface PageLinks {
  self: string;
  first?: string;
  prev?: string;
  next?: string;
}

export interface FountainPage extends PageLinks {
  items: Fountain[];
}

export interface DistrictWithNeighbourhoods extends CodeName {
  neighbourhoods: CodeName[];
}

export interface DistrictList {
  items: DistrictWithNeighbourhoods[];
}

export interface InvalidParam {
  name: string;
  reason: string;
}

export interface Problem {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  invalid_params?: InvalidParam[];
}

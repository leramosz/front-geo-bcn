import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fountain } from '../test/factories';
import { FilterBar, areaName } from './FilterBar';
import { FountainSheet } from './FountainSheet';
import { NearbyPanel } from './NearbyPanel';

const districts = [
  { id: '01', name: 'Ciutat Vella', neighbourhoods: [{ id: '03', name: 'la Barceloneta' }, { id: '01', name: 'el Raval' }] },
  { id: '02', name: 'Eixample', neighbourhoods: [{ id: '05', name: "el Fort Pienc" }] },
];

describe('FountainSheet', () => {
  it('muestra nombre, dirección, barrio, distrito y estado', () => {
    render(<FountainSheet fountain={fountain()} onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Sant Carles' })).toBeInTheDocument();
    expect(screen.getByTestId('sheet-address')).toHaveTextContent('C COMTE DE SANTA CLARA, 11');
    expect(screen.getByText('la Barceloneta')).toBeInTheDocument();
    expect(screen.getByText('Ciutat Vella')).toBeInTheDocument();
    expect(screen.getByTestId('sheet-status')).toHaveTextContent('No disponible');
  });

  it('enlaza "Cómo llegar" a las coordenadas de la fuente', () => {
    render(<FountainSheet fountain={fountain()} onClose={() => {}} />);
    const link = screen.getByRole('link', { name: 'Cómo llegar' });
    expect(link.getAttribute('href')).toContain('destination=41.379145587%2C2.18896495');
  });

  it('cierra con el botón', async () => {
    const onClose = vi.fn();
    render(<FountainSheet fountain={fountain()} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('no escribe "null" ni deja huecos con datos ausentes', () => {
    const f = fountain({ name: null, neighbourhood: null, address: { street: 'C X', street_number: null, formatted: null } });
    const { container } = render(<FountainSheet fountain={f} onClose={() => {}} />);
    expect(container.textContent).not.toMatch(/null/i);
    expect(screen.getByTestId('sheet-address')).toHaveTextContent(/^C X$/);
  });
});

describe('FilterBar (KAN-9)', () => {
  it('solo ofrece los barrios del distrito elegido', () => {
    render(<FilterBar districts={districts} value={{ districtId: '01', neighbourhoodId: '' }} onChange={() => {}} />);
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toContain('la Barceloneta');
    expect(options).not.toContain('el Fort Pienc');
  });

  it('deshabilita el barrio sin distrito y no muestra "Quitar filtro"', () => {
    render(<FilterBar districts={districts} value={{ districtId: '', neighbourhoodId: '' }} onChange={() => {}} />);
    expect(screen.getByLabelText('Barrio')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Quitar filtro' })).not.toBeInTheDocument();
  });

  it('al cambiar de distrito reinicia el barrio', async () => {
    const onChange = vi.fn();
    render(<FilterBar districts={districts} value={{ districtId: '01', neighbourhoodId: '03' }} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Distrito'), '02');
    expect(onChange).toHaveBeenCalledWith({ districtId: '02', neighbourhoodId: '' });
  });

  it('"Quitar filtro" limpia ambos', async () => {
    const onChange = vi.fn();
    render(<FilterBar districts={districts} value={{ districtId: '01', neighbourhoodId: '03' }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtro' }));
    expect(onChange).toHaveBeenCalledWith({ districtId: '', neighbourhoodId: '' });
  });

  it('areaName devuelve el barrio si lo hay y si no el distrito', () => {
    expect(areaName(districts, { districtId: '01', neighbourhoodId: '03' })).toBe('la Barceloneta');
    expect(areaName(districts, { districtId: '01', neighbourhoodId: '' })).toBe('Ciutat Vella');
    expect(areaName(districts, { districtId: '', neighbourhoodId: '' })).toBeUndefined();
  });
});

describe('NearbyPanel (KAN-8)', () => {
  const base = { geo: { status: 'idle' as const }, hasOrigin: true, radius: 500, onWiden: () => {}, onPick: () => {}, onClose: () => {} };

  it('lista las fuentes con su distancia en metros', () => {
    const items = [fountain({ id: '01-001', name: 'A', distance: 45 }), fountain({ id: '01-002', name: 'B', distance: 120 })];
    render(<NearbyPanel {...base} result={{ status: 'ready', items }} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('45 m');
    expect(rows[1]).toHaveTextContent('120 m');
  });

  it('sin permiso de ubicación pide activarla o tocar el mapa', () => {
    render(<NearbyPanel {...base} hasOrigin={false} geo={{ status: 'denied' }} result={{ status: 'idle' }} />);
    expect(screen.getByText('Activa la ubicación o toca un punto del mapa')).toBeInTheDocument();
  });

  it('sin fuentes ofrece ampliar el radio', async () => {
    const onWiden = vi.fn();
    render(<NearbyPanel {...base} onWiden={onWiden} result={{ status: 'ready', items: [] }} />);
    expect(screen.getByText('No hay fuentes a menos de 500 m')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ampliar radio' }));
    expect(onWiden).toHaveBeenCalledOnce();
  });

  it('elegir una fuente de la lista la abre', async () => {
    const onPick = vi.fn();
    const f = fountain({ distance: 45 });
    render(<NearbyPanel {...base} onPick={onPick} result={{ status: 'ready', items: [f] }} />);
    await userEvent.click(screen.getByRole('button', { name: /Sant Carles/ }));
    expect(onPick).toHaveBeenCalledWith(f);
  });
});

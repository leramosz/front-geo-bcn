import { createContext, useContext, type ReactNode } from 'react';
import { createClient, type GeoBcnClient } from './client';

const ClientContext = createContext<GeoBcnClient>(createClient());

export function ClientProvider({ client, children }: { client: GeoBcnClient; children: ReactNode }) {
  return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>;
}

export const useClient = () => useContext(ClientContext);

import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

type DomainType = 'photographer' | 'client_portal' | 'dev';

interface DomainInfo {
  type: DomainType;
  photographerSlug?: string;
  isCustomSubdomain: boolean;
}

interface DomainContextValue {
  domain: DomainInfo | null;
  isLoading: boolean;
}

const DomainContext = createContext<DomainContextValue | undefined>(undefined);

export function DomainProvider({ children }: { children: ReactNode }) {
  const { data: domain, isLoading } = useQuery<DomainInfo>({
    queryKey: ['/api/domain'],
    staleTime: 5 * 60 * 1000, // 5 minutes - allow refetching for admin/support switching tenants
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  return (
    <DomainContext.Provider value={{ domain: domain || null, isLoading }}>
      {children}
    </DomainContext.Provider>
  );
}

export function useDomain() {
  const context = useContext(DomainContext);
  if (context === undefined) {
    throw new Error('useDomain must be used within DomainProvider');
  }
  return context;
}

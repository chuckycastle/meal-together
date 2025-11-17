/**
 * Family Context
 * Manages active family selection and family-related state
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Family } from '../types';
import { useFamilies } from '../hooks/useFamilies';

interface FamilyContextValue {
  activeFamily: Family | null;
  setActiveFamily: (family: Family | null) => void;
  families: Family[];
  isLoading: boolean;
  error: Error | null;
}

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

interface FamilyProviderProps {
  children: ReactNode;
}

const ACTIVE_FAMILY_KEY = 'active_family_id';

export const FamilyProvider: React.FC<FamilyProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { data: families = [], isLoading, error } = useFamilies(isAuthenticated);
  const [activeFamily, setActiveFamilyState] = useState<Family | null>(null);

  // Load active family from localStorage on mount
  useEffect(() => {
    if (!isAuthenticated || families.length === 0) {
      return;
    }

    const storedFamilyId = localStorage.getItem(ACTIVE_FAMILY_KEY);

    if (storedFamilyId) {
      const family = families.find(f => f.id === parseInt(storedFamilyId));
      if (family) {
        setActiveFamilyState(family);
        return;
      }
    }

    // Default to first family if no stored selection
    if (families.length > 0 && !activeFamily) {
      setActiveFamilyState(families[0]);
      localStorage.setItem(ACTIVE_FAMILY_KEY, families[0].id.toString());
    }
  }, [families, isAuthenticated, activeFamily]);

  // Clear active family on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setActiveFamilyState(null);
      localStorage.removeItem(ACTIVE_FAMILY_KEY);
    }
  }, [isAuthenticated]);

  const setActiveFamily = (family: Family | null) => {
    setActiveFamilyState(family);
    if (family) {
      localStorage.setItem(ACTIVE_FAMILY_KEY, family.id.toString());
    } else {
      localStorage.removeItem(ACTIVE_FAMILY_KEY);
    }
  };

  const value: FamilyContextValue = {
    activeFamily,
    setActiveFamily,
    families,
    isLoading,
    error: error as Error | null,
  };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
};

export const useFamily = (): FamilyContextValue => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within FamilyProvider');
  }
  return context;
};

export default FamilyContext;

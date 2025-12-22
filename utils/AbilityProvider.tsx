
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchUserTeams } from '@/utils/fetchUserTeams';
import { getPermissionsForGroups } from '@/utils/permissionLoader';

export type AppAbility = ReturnType<typeof createMongoAbility>;

const AbilityContext = createContext<AppAbility | null>(null);

export function useAbility() {
  return useContext(AbilityContext);
}

function defineAbilitiesFor(groups: string[]) {
  const rules = getPermissionsForGroups(groups);
  return createMongoAbility(rules);
}

export const AbilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ability, setAbility] = useState<AppAbility>(defineAbilitiesFor([]));

  useEffect(() => {
    async function syncAbilities() {
      const groups = await fetchUserTeams();
      console.log('Appwrite user groups:', groups);
      setAbility(defineAbilitiesFor(groups));
    }
    syncAbilities();
  }, []);

  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
};

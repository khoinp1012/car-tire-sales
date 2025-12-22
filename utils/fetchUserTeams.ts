

import { Teams } from 'react-native-appwrite';
import appwrite from '@/constants/appwrite';

export async function fetchUserTeams(): Promise<string[]> {
  const teams = new Teams(appwrite);
  try {
    const response = await teams.list();
    // Return team names (or IDs) for the current user
    return response.teams?.map((team: any) => team.name) || [];
  } catch (error) {
    console.error('Failed to fetch user teams:', error);
    return [];
  }
}

import { account } from '@/constants/appwrite';
import { router } from 'expo-router';

export async function logout() {
  try {
    await account.deleteSession('current');
    router.replace('/'); // Redirect to main login page (index)
  } catch (err) {
    // Optionally handle error
  }
}

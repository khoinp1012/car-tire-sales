import { Client, Account } from 'react-native-appwrite';

const appwrite = new Client();

appwrite
  .setEndpoint('https://syd.cloud.appwrite.io/v1') // TODO: Replace with your Appwrite endpoint
  .setProject('687b358f00367ce271e0'); // TODO: Replace with your Appwrite project ID

export const account = new Account(appwrite);
export default appwrite;

// Google OAuth2 provider config example:
// account.createOAuth2Session('google', 'app://redirect', 'app://redirect');

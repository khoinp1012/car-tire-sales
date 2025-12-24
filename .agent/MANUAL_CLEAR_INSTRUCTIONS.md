# Manual Database Clear Instructions

## If the "Clear Database & Retry" button doesn't work, follow these steps:

### For Android:

1. **Close the app completely**
   - Swipe it away from recent apps

2. **Go to Android Settings**
   - Open Settings app
   - Go to "Apps" or "Applications"

3. **Find your app**
   - Scroll to find "My New Project" (or your app name)
   - Tap on it

4. **Clear Storage**
   - Tap "Storage" or "Storage & cache"
   - Tap "Clear Storage" or "Clear Data"
   - Confirm when asked

5. **Reopen the app**
   - You'll need to log in again
   - Database will be fresh and sync from server

### What this does:

- ✅ Removes ALL local app data (including corrupted database)
- ✅ Clears your login session (you'll need to log in again)
- ❌ Server data is safe (everything in Appwrite is preserved)

### After clearing:

1. Log in again
2. Wait for data to sync from Appwrite
3. Everything should work normally

---

## Why the automatic clear might not work:

The DVM1 error happens when the database is so corrupted that even creating a database instance fails. In this case, only the Android system can clear the storage.

## Alternative: Reinstall the app

If clearing storage doesn't work:

1. Uninstall the app
2. Reinstall it
3. Log in again
4. Data will sync from server

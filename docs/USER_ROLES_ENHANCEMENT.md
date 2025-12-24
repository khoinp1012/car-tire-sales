# User Roles Database Enhancement

## Overview

Added `name` and `email` attributes to the `user_roles` collection for easier user identification in the admin interface.

## Changes Made

### 1. Database Schema Update

**New Attributes in `user_roles` collection:**
- `name` (string, 255 chars, optional) - User's display name
- `email` (string, 255 chars, optional) - User's email address

**Existing Attributes:**
- `userId` (string) - Appwrite user ID
- `role` (string) - User's assigned role

### 2. Migration Script

**File**: `migrate-user-roles.sh`

**Purpose**: Adds the new `name` and `email` attributes to the existing `user_roles` collection.

**Usage**:
```bash
./migrate-user-roles.sh
```

**What it does**:
- Connects to your Appwrite database
- Adds `name` attribute (string, 255 chars, optional)
- Adds `email` attribute (string, 255 chars, optional)
- Safe to run multiple times (won't error if attributes already exist)

### 3. Code Updates

#### `utils/userRoleService.ts`
- Updated `setUserRole()` function to automatically fetch and save user's name and email
- When assigning a role, the function now:
  1. Fetches the current user's info via `account.get()`
  2. Extracts name and email
  3. Saves them along with the role

**Limitation**: Can only fetch info for the current logged-in user. If an admin assigns a role to a different user, name/email will be empty (would need Appwrite Users API with admin permissions).

#### `app/manage_users.tsx`
- Updated to display actual name and email from database
- Falls back to truncated userId if name/email not available
- Updated info message to reflect new functionality

## Benefits

### ✅ **Better User Identification**
Before:
```
User: 65f3a2b1...
Email: 65f3a2b1c4d5e6f7a8b9c0d1
```

After:
```
User: John Doe
Email: john.doe@example.com
```

### ✅ **Easier Admin Management**
- Admins can quickly see who has which role
- No need to cross-reference user IDs with Appwrite Console
- Search by name or email in the Manage Users screen

### ✅ **Backwards Compatible**
- Existing documents work fine (name/email will be empty)
- New role assignments automatically populate the fields
- No breaking changes

## Migration Steps

### For New Installations
1. Run `./migrate-user-roles.sh` after setting up permissions
2. Assign roles via the admin UI
3. Name and email will be automatically saved

### For Existing Installations
1. **Run migration script**:
   ```bash
   ./migrate-user-roles.sh
   ```

2. **Update existing documents** (optional):
   - Option A: Reassign roles via admin UI (will populate name/email)
   - Option B: Manually update via Appwrite Console
   - Option C: Leave as-is (will show userId until reassigned)

## Technical Details

### Database Structure

**Before**:
```json
{
  "$id": "doc123",
  "userId": "65f3a2b1c4d5e6f7a8b9c0d1",
  "role": "admin"
}
```

**After**:
```json
{
  "$id": "doc123",
  "userId": "65f3a2b1c4d5e6f7a8b9c0d1",
  "role": "admin",
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

### Auto-Population Logic

When `setUserRole(userId, role)` is called:

1. **If userId matches current user**:
   - Fetch name/email from `account.get()`
   - Save to database ✅

2. **If userId is different user**:
   - Cannot fetch their info (requires admin API)
   - Save empty strings for name/email
   - Admin can manually update via Console if needed

## Future Enhancements

### Possible Improvements:
1. **Admin API Integration**: Use Appwrite Users API with admin permissions to fetch any user's info
2. **Bulk Update Script**: Create a script to populate name/email for all existing documents
3. **User Profile Sync**: Automatically update name/email when user updates their profile
4. **Search Enhancement**: Add full-text search on name/email fields

## Files Modified

| File | Changes |
|------|---------|
| `migrate-user-roles.sh` | New migration script |
| `utils/userRoleService.ts` | Auto-save name/email when setting role |
| `app/manage_users.tsx` | Display name/email from database |

## Testing

After running the migration:

1. ✅ Go to **Manage Users** page
2. ✅ Assign a role to yourself
3. ✅ Check that your name and email appear
4. ✅ Navigate away and back - data persists
5. ✅ Search by name or email - works correctly

## Rollback

If you need to remove the attributes:

```bash
# Via Appwrite CLI
appwrite databases delete-attribute \
  --database-id "$DB_ID" \
  --collection-id "user_roles" \
  --key "name"

appwrite databases delete-attribute \
  --database-id "$DB_ID" \
  --collection-id "user_roles" \
  --key "email"
```

**Note**: This will permanently delete the data in these fields!

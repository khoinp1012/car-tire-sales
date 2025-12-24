# Location Tracking Feature

## Overview
The Location Tracking feature allows you to efficiently assign physical storage locations to tires by scanning their QR codes and then scanning a stack location QR code. This enables batch updates of tire locations in the inventory system.

## How It Works

### User Flow
1. **Open Location Tracking Page** - Navigate to the location tracking screen
2. **Scan Tire QR Codes** - Continuously scan tire QR codes (format: `TT1_xxxxx`)
   - Each scanned tire is added to a pending list
   - A counter shows how many tires have been scanned
   - Duplicate scans are automatically ignored
3. **Scan Stack QR Code** - Scan a stack location QR code (format: `STACK_xxxxx`)
   - Scanner pauses and shows a confirmation panel
   - Lists all scanned tires
   - Allows removal of mis-scanned items
4. **Confirm or Cancel**
   - **Confirm**: Updates all tires with the stack location
   - **Cancel**: Returns to scanning mode, keeps pending tires
   - **Clear All**: Removes all pending tires

### QR Code Formats
- **Tire QR**: `TT1_12345` (existing inventory QR format)
- **Stack QR**: `STACK_A1`, `STACK_B2`, etc.

## Setup Instructions

### 1. Database Setup
Run the setup script to create the stacks collection:

```bash
./setup-stacks-collection.sh
```

This creates a `stacks` collection with:
- `stackId` (string, required) - Unique identifier (e.g., "A1", "B2")
- `location` (string, required) - Physical location description
- `description` (string, optional) - Additional details
- `capacity` (integer, optional) - Maximum tire capacity

### 2. Add Stack Records
Create stack records in your Appwrite database. Example:

```json
{
  "stackId": "A1",
  "location": "Warehouse Section A, Row 1",
  "description": "Premium tire storage",
  "capacity": 100
}
```

### 3. Generate Stack QR Codes
Generate QR codes for each stack with the format `STACK_{stackId}`:
- `STACK_A1`
- `STACK_A2`
- `STACK_B1`
- etc.

Print and attach these QR codes to the physical stack locations.

### 4. Update Inventory Schema
Ensure your inventory collection has a `location` field (string) to store the stack location.

### 5. Update Permissions
Run the permission setup to ensure the stacks collection has proper permissions:

```bash
./setup-permissions.sh
```

Add stacks collection permissions to your permission configuration:
```json
{
  "stacks": {
    "read": ["admin", "inventory_manager", "seller"],
    "create": ["admin", "inventory_manager"],
    "update": ["admin", "inventory_manager"],
    "delete": ["admin"]
  }
}
```

## Technical Details

### Backend
- **Collection**: `stacks`
- **Attributes**:
  - `stackId`: Unique stack identifier
  - `location`: Physical location description
  - `description`: Optional notes
  - `capacity`: Optional maximum capacity
- **Indexes**:
  - `stackId_index`: Fast lookup by stack ID
  - `location_index`: Search by location

### Frontend
- **Page**: `app/location_tracking.tsx`
- **Features**:
  - Continuous QR scanning
  - Duplicate scan prevention (2-second debounce)
  - Batch location updates
  - Confirmation panel with tire list
  - Error handling for invalid QR codes
  - Permission checks

### Permissions Required
- **Update Inventory**: Users must have `update` permission on the `inventory` collection

## Usage Tips

1. **Batch Processing**: Scan multiple tires before scanning the stack QR for efficient batch updates
2. **Error Correction**: Use the delete button in the confirmation panel to remove mis-scanned tires
3. **Clear All**: Use the "Clear All" button to start over if you make mistakes
4. **Stack Verification**: The system verifies that the stack exists before updating tire locations

## Troubleshooting

### "Stack location not found"
- Ensure the stack record exists in the database
- Verify the stackId matches the QR code (without the `STACK_` prefix)

### "Invalid QR code"
- Only tire QR codes (`TT1_xxxxx`) and stack QR codes (`STACK_xxxxx`) are accepted
- Check that QR codes are properly formatted

### "No permission to update tire locations"
- User must have `update` permission on the `inventory` collection
- Contact an administrator to adjust permissions

### Scanner not working
- Ensure camera permissions are granted
- Check that the device has a working camera
- Try refreshing the page

## Environment Variables

Add to your `.env` file:
```
EXPO_PUBLIC_COLLECTION_STACKS=stacks
```

## Files Modified/Created

### New Files
- `app/location_tracking.tsx` - Location tracking page
- `setup-stacks-collection.sh` - Database setup script
- `LOCATION_TRACKING.md` - This documentation

### Modified Files
- `constants/config.ts` - Added `STACK` QR prefix
- `constants/env.ts` - Added `STACKS` collection
- `constants/i18n.ts` - Added location tracking translations
- `setup-permissions.sh` - Added stacks collection variable
- `functions/sync-collection-permissions/src/index.js` - Added stacks to collection map

## Future Enhancements

Potential improvements:
- Stack capacity tracking (show how many tires are in each stack)
- Location history (track when tires were moved)
- Stack search and filtering
- Barcode scanner support for non-QR barcodes
- Offline support with sync when online
- Stack occupancy visualization
- Location-based inventory reports

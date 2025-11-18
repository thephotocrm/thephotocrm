# CLIENT User clientId Backfill Instructions

## Problem
Existing CLIENT users created before November 18, 2024 don't have their `clientId` field populated, which prevents their avatar initials from displaying in the client portal sidebar.

## Solution
Run the backfill script to match existing CLIENT users to their contact records and populate the `clientId` field.

## How to Use (Production - Railway)

### Step 1: Dry Run (Preview Changes)
First, run in dry-run mode to see what would be updated WITHOUT making any changes:

```bash
# SSH into your Railway deployment or use Railway CLI
railway run bash

# Then run this curl command with your admin credentials:
curl -X POST https://thephotocrm.com/api/admin/backfill-client-ids \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_ADMIN_JWT_TOKEN_HERE" \
  -d '{"dryRun": true}'
```

**Expected Response (Dry Run):**
```json
{
  "success": true,
  "dryRun": true,
  "summary": {
    "updated": 2,
    "skipped": 0,
    "total": 2
  },
  "details": [
    {
      "email": "austin@example.com",
      "photographerId": "abc123",
      "clientId": "contact-id-123",
      "contactName": "Austin Pacholek",
      "status": "DRY_RUN_SUCCESS"
    }
  ]
}
```

### Step 2: Review the Details
Check the `details` array to ensure:
- All expected users are listed
- No users were skipped unexpectedly
- The `contactName` matches what you expect

### Step 3: Run for Real
Once you're confident with the dry-run results, execute the actual update:

```bash
curl -X POST https://thephotocrm.com/api/admin/backfill-client-ids \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_ADMIN_JWT_TOKEN_HERE" \
  -d '{"dryRun": false}'
```

**Expected Response (Real Run):**
```json
{
  "success": true,
  "dryRun": false,
  "summary": {
    "updated": 2,
    "skipped": 0,
    "total": 2
  },
  "details": [
    {
      "email": "austin@example.com",
      "photographerId": "abc123",
      "clientId": "contact-id-123",
      "contactName": "Austin Pacholek",
      "status": "UPDATED"
    }
  ]
}
```

### Step 4: Verify
After running the backfill:
1. Have affected clients refresh their portal (hard refresh: Cmd+Shift+R or Ctrl+F5)
2. Check that avatar initials now appear in the sidebar
3. Verify the full name displays correctly

## Safety Features
- **Dry-run mode**: Preview changes before applying them
- **Duplicate detection**: Skips users with ambiguous contact matches
- **Idempotent**: Safe to run multiple times (won't break already-fixed users)
- **Transaction-safe**: Uses database constraints to prevent data corruption
- **Admin-only**: Requires ADMIN role authentication

## Troubleshooting

### Users Skipped
If users are being skipped, check the `reason` field:
- `"No matching contact found"`: Contact doesn't exist or email mismatch
- `"Multiple contacts found (N)"`: Multiple contacts with same email for that photographer (ambiguous)

### Authentication Errors
Make sure you're using a valid ADMIN JWT token. You can get this from:
1. Login to the admin dashboard at thephotocrm.com
2. Open browser DevTools > Application > Cookies
3. Copy the `token` cookie value

## How It Works
The backfill script:
1. Finds all CLIENT users where `clientId IS NULL`
2. For each user, searches for a contact matching:
   - Same `email`
   - Same `photographerId`
3. Validates the match is unique (not ambiguous)
4. Updates the user's `clientId` field

## Going Forward
This backfill is a **one-time fix**. All new CLIENT users created after November 18, 2024 will automatically have `clientId` populated via:
- Magic link authentication (`/api/magic-link/:token`)
- Portal token validation (`/api/portal/:token`)

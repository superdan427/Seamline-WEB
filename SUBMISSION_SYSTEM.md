# Place Submission System Documentation

## Overview

A secure place submission system that allows authenticated users to submit new fabric shops, leather suppliers, and sewing services for review before they appear on the map.

---

## Files Created/Modified

### 1. **submit.html** - Submission Form Page
**Location:** `/submit.html`

**Features:**
- Clean, user-friendly form interface
- Required fields: name, category, address, brief description (100-200 chars)
- Optional fields: website, phone, opening hours, tags, detailed info, price range
- Character counter for description field
- Collapsible "Optional Details" section
- Success message after submission
- Responsive design matching site aesthetic

### 2. **src/submit.js** - Submission Logic
**Location:** `/src/submit.js`

**Features:**
- ✅ **Authentication check** - Users must sign in to submit
- ✅ **Input validation** - All fields validated using validator.js
- ✅ **Geocoding** - Converts addresses to lat/lng using Mapbox API
- ✅ **Tag loading** - Dynamically loads existing tags from database
- ✅ **Security measures** - Uses textContent, validates inputs, sanitizes data
- ✅ **Error handling** - Clear error messages for users
- ✅ **Loading states** - Shows progress (Submitting → Finding location → Saving)

---

## Security Features

### Input Validation
All user inputs are validated before submission:

```javascript
// Name validation
const name = validateName(formData.get('name'), 2, 200);

// URL validation (blocks javascript:, data: protocols)
const website = websiteInput ? validateUrl(websiteInput, false) : null;

// Phone validation
const phone = phoneInput ? validatePhone(phoneInput, false) : null;

// Text validation with length limits
const pop_up = validateText(formData.get('pop_up'), 200, true);
const more_info = validateText(formData.get('more_info'), 2000, false);
```

### XSS Prevention
```javascript
// Tags are rendered safely using textContent
const span = document.createElement('span');
span.textContent = tag;  // ✅ Safe - no XSS possible
```

### Authentication
```javascript
// Users must be authenticated to submit
const user = getCurrentUser() || (await getCurrentUserAsync());
if (!user) {
  // Redirect to login page
  window.location.href = 'account.html';
  return;
}
```

---

## How It Works

### User Flow

1. **User navigates to Submit page**
   - Menu: "Submit a place" → `submit.html`

2. **Authentication check**
   - If not signed in: Shows warning message, disables form
   - If signed in: Form is enabled

3. **User fills out form**
   - Required: Name, Category, Address, Brief Description (100-200 chars)
   - Optional: Website, Phone, Hours, Tags, More Info, Price

4. **Character counter**
   - Shows real-time character count for description
   - Colors: Red (< 100), Yellow (> 180), Gray (100-180)

5. **Form submission**
   - Client-side validation runs first
   - Address is geocoded to lat/lng
   - Data is saved to database with `approved: false`
   - Success message is shown

6. **Admin review**
   - Admins can view pending submissions
   - Approve/reject submitted places
   - Once approved, places appear on map

---

## Database Fields

Submissions are stored in the `places` table with these fields:

### Required Fields
```javascript
{
  name: string,              // Place name (2-200 chars)
  category: string,          // One of: Fabric Shop, Leather, Services, etc.
  address: string,           // Full address
  pop_up: string,            // Brief description (100-200 chars)
  lat: number,               // Latitude (from geocoding)
  lng: number,               // Longitude (from geocoding)
  approved: false,           // Must be reviewed by admin
  submitted_by: UUID,        // User who submitted
  submitted_at: timestamp    // Submission time
}
```

### Optional Fields
```javascript
{
  website: string | null,       // Validated URL
  phone: string | null,         // Phone number
  opening_hours: string | null, // Hours text
  more_info: string | null,     // Detailed description
  average_price: string | null, // Price range
  tags: array | null,           // Selected tags
  slug: null                    // Generated after approval
}
```

---

## Geocoding

The system uses **Mapbox Geocoding API** to convert addresses to coordinates:

```javascript
// Example API call
https://api.mapbox.com/geocoding/v5/mapbox.places/
  123%20High%20St%2C%20London%20E1%206AN
  .json?access_token=YOUR_TOKEN&limit=1

// Response
{
  features: [{
    center: [-0.0715, 51.5152]  // [lng, lat]
  }]
}
```

**Token:** Uses `window.MAPBOX_TOKEN` from config.js (same as map)

---

## Validation Rules

| Field | Min | Max | Required | Validation |
|-------|-----|-----|----------|------------|
| **Name** | 2 | 200 | ✅ | No HTML, no scripts |
| **Category** | - | - | ✅ | Must be from dropdown |
| **Address** | 5 | - | ✅ | Must geocode successfully |
| **Website** | - | 2000 | ❌ | Valid URL, blocks javascript: |
| **Phone** | 7 | 20 | ❌ | Numbers, spaces, hyphens only |
| **Description** | 100 | 200 | ✅ | Text only |
| **Opening Hours** | - | 1000 | ❌ | Text only |
| **More Info** | - | 2000 | ❌ | Text only |
| **Average Price** | - | 100 | ❌ | Text only |
| **Tags** | - | - | ❌ | From existing tags |

---

## Error Handling

### User-Friendly Error Messages

```javascript
// Not signed in
"Please sign in to submit a place. Redirecting to login..."

// Validation errors
"Place name must be at least 2 characters"
"Please select a category"
"Please enter a valid address"
"Invalid URL format"
"Brief description must be at least 100 characters"

// Geocoding errors
"Could not find location. Please check the address and try again."

// Database errors
"Failed to submit place. Please try again."
```

### Error Display
- Errors shown in red banner at top of page
- Auto-hide after 10 seconds
- Page scrolls to top to ensure visibility

---

## Admin Review Process

### For Admins (Future Implementation)

To approve submissions, admins will need to:

1. Query unapproved places:
```sql
SELECT * FROM places
WHERE approved = false
ORDER BY submitted_at DESC;
```

2. Review the submission
   - Check if information is accurate
   - Verify location is correct on map
   - Ensure content is appropriate

3. Approve or reject:
```sql
-- Approve
UPDATE places
SET approved = true,
    approved_by = <admin_user_id>,
    approved_at = NOW(),
    slug = generate_slug(name)  -- Generate unique slug
WHERE id = <place_id>;

-- Reject/Delete
DELETE FROM places WHERE id = <place_id>;
```

---

## Testing Checklist

### Manual Testing

- [ ] Navigate to submit.html
- [ ] Verify authentication check works (shows message if not signed in)
- [ ] Sign in as a user
- [ ] Fill out form with valid data
- [ ] Verify character counter updates
- [ ] Test geocoding with real address
- [ ] Submit form
- [ ] Verify success message appears
- [ ] Check database for new row with `approved: false`

### Security Testing

- [ ] Try submitting with `<script>alert('XSS')</script>` in name
- [ ] Try submitting with `javascript:alert('XSS')` in website field
- [ ] Try submitting with empty required fields
- [ ] Try submitting with description < 100 characters
- [ ] Try submitting with very long inputs (> max length)
- [ ] Verify tags are displayed safely (no XSS possible)

### Error Testing

- [ ] Test with invalid address (should show geocoding error)
- [ ] Test without signing in (should show auth error)
- [ ] Test with invalid URL format
- [ ] Test with disconnected internet (should show error)

---

## Troubleshooting

### "Mapbox token not configured"
**Solution:** Ensure `config.local.js` has `window.MAPBOX_TOKEN` set

### "Could not find location"
**Possible causes:**
1. Address is too vague (e.g., just "London")
2. Address doesn't exist
3. Geocoding API is down
4. Network error

**Solution:** Ask user to provide more specific address

### "Please sign in to submit a place"
**Solution:** User needs to create account or sign in via account.html

### Form doesn't submit
**Check:**
1. Browser console for JavaScript errors
2. Network tab for failed API calls
3. Supabase RLS policies allow inserts for authenticated users

---

## Future Enhancements

### Potential Improvements

1. **Photo Upload**
   - Allow users to upload photos
   - Store in Supabase Storage
   - Add to `photos` array field

2. **Admin Dashboard**
   - Create admin.html for reviewing submissions
   - Approve/reject interface
   - Edit submissions before approval

3. **Email Notifications**
   - Notify admin when new place is submitted
   - Notify user when their submission is approved/rejected

4. **Draft Saves**
   - Allow users to save drafts
   - Resume editing later

5. **Address Autocomplete**
   - Use Mapbox Search API for address suggestions
   - Improve geocoding accuracy

6. **Duplicate Detection**
   - Check if place already exists
   - Prevent duplicate submissions

---

## Files Reference

```
seamlineWEB/
├── submit.html              # ✅ Submission form page
├── src/
│   ├── submit.js           # ✅ Submission logic
│   ├── supabaseClient.js   # Supabase client (existing)
│   └── ...
├── utils/
│   ├── validator.js        # ✅ Input validation (existing)
│   ├── sanitizer.js        # ✅ XSS prevention (existing)
│   └── storage.js          # Auth utilities (existing)
└── config.local.js         # ✅ Mapbox token (existing)
```

---

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Supabase connection
3. Check RLS policies in Supabase dashboard
4. Review this documentation

---

**Status:** ✅ Ready for Testing

The submission system is complete and ready for user testing. All security measures are in place, and the system integrates seamlessly with your existing authentication and validation infrastructure.

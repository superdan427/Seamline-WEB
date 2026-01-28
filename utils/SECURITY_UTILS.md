# Security Utilities Documentation

## Overview

This directory contains security utilities to prevent XSS (Cross-Site Scripting) attacks, SQL injection, and other web vulnerabilities.

## Files

- **sanitizer.js** - HTML/URL/content sanitization functions
- **validator.js** - Input validation functions
- **test-sanitizer.html** - Interactive test suite for sanitizer

---

## 🛡️ Sanitizer.js

### Purpose
Prevents XSS attacks by escaping/sanitizing user-generated content before displaying it.

### When to Use

**❌ NEVER do this (UNSAFE):**
```javascript
// Vulnerable to XSS attacks
element.innerHTML = userInput;
img.src = userProvidedUrl;
link.href = userProvidedUrl;
```

**✅ ALWAYS do this (SAFE):**
```javascript
import { escapeHtml, sanitizeUrl, createSafeElement } from './utils/sanitizer.js';

// Option 1: Escape HTML
element.innerHTML = escapeHtml(userInput);

// Option 2: Use textContent (BEST for plain text)
element.textContent = userInput;

// Option 3: Use helper functions
const safeDiv = createSafeElement('div', userInput);
element.appendChild(safeDiv);
```

### Key Functions

#### `escapeHtml(unsafe)`
Converts dangerous HTML characters to safe entities.

```javascript
import { escapeHtml } from './utils/sanitizer.js';

const userInput = '<script>alert("XSS")</script>';
element.innerHTML = `<div>${escapeHtml(userInput)}</div>`;
// Result: <div>&lt;script&gt;alert("XSS")&lt;/script&gt;</div>
```

#### `sanitizeUrl(url)`
Blocks dangerous URL protocols (javascript:, data:, etc.).

```javascript
import { sanitizeUrl } from './utils/sanitizer.js';

const userUrl = 'javascript:alert("XSS")';
const safe = sanitizeUrl(userUrl);  // Returns ''

const goodUrl = 'https://example.com';
const safe2 = sanitizeUrl(goodUrl);  // Returns 'https://example.com'

const bareUrl = 'example.com';
const safe3 = sanitizeUrl(bareUrl);  // Returns 'https://example.com'
```

#### `createSafeElement(tagName, textContent, className)`
Creates a DOM element with safely escaped text.

```javascript
import { createSafeElement } from './utils/sanitizer.js';

const safeDiv = createSafeElement('div', userInput, 'my-class');
container.appendChild(safeDiv);
// textContent is automatically escaped by the browser
```

#### `createSafeImage(src, alt, className)`
Creates an image element with sanitized URL.

```javascript
import { createSafeImage } from './utils/sanitizer.js';

const img = createSafeImage(userImageUrl, 'User photo', 'profile-pic');
container.appendChild(img);
// Automatically blocks javascript: and data: URLs
```

#### `createSafeLink(href, textContent, className)`
Creates a link element with sanitized URL.

```javascript
import { createSafeLink } from './utils/sanitizer.js';

const link = createSafeLink(userUrl, 'Visit website', 'external-link');
container.appendChild(link);
// Automatically adds rel="noopener noreferrer" for external links
```

#### `stripHtmlTags(html)`
Removes all HTML tags, leaving only text.

```javascript
import { stripHtmlTags } from './utils/sanitizer.js';

const dirty = '<b>Hello</b> <script>alert(1)</script>World';
const clean = stripHtmlTags(dirty);  // Returns 'Hello World'
```

#### `sanitizePhotoArray(photos, maxCount)`
Sanitizes an array of photo URLs.

```javascript
import { sanitizePhotoArray } from './utils/sanitizer.js';

const photos = [
  'javascript:alert(1)',
  'https://example.com/photo1.jpg',
  'data:text/html,<script>',
  'https://example.com/photo2.jpg'
];

const safePhotos = sanitizePhotoArray(photos, 4);
// Returns: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']
```

---

## ✅ Validator.js

### Purpose
Validates user input to ensure data integrity and prevent injection attacks.

### Key Functions

#### `validateEmail(email)`
Validates email format and normalizes it.

```javascript
import { validateEmail } from './utils/validator.js';

try {
  const email = validateEmail(userInput);
  // email is now: lowercase, trimmed, validated format
  await signupUser(email);
} catch (err) {
  showError(err.message);  // "Invalid email format"
}
```

**Validation Rules:**
- Must match email format: `user@domain.com`
- Length: 3-254 characters (RFC 5321)
- No dangerous characters: `<>'"`;\\`
- Returns lowercase normalized email

#### `validatePassword(password)`
Validates password strength.

```javascript
import { validatePassword } from './utils/validator.js';

try {
  const password = validatePassword(userInput);
  await createAccount(password);
} catch (err) {
  showError(err.message);  // Specific requirement that failed
}
```

**Requirements:**
- Minimum 8 characters
- Maximum 128 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number

#### `checkPasswordStrength(password)`
Checks password strength without throwing errors.

```javascript
import { checkPasswordStrength } from './utils/validator.js';

const strength = checkPasswordStrength(userInput);
// Returns: { strength: 'weak'|'medium'|'strong', score: number, feedback: Array }

if (strength.strength === 'weak') {
  showWarning('Please use a stronger password');
}
```

#### `validateName(name, minLength, maxLength)`
Validates display names, place names, etc.

```javascript
import { validateName } from './utils/validator.js';

try {
  const name = validateName(userInput, 2, 50);
  // Safe to use
} catch (err) {
  showError(err.message);
}
```

**Validation:**
- Trims whitespace
- Checks length constraints
- Blocks HTML tags
- Blocks script injection attempts
- Blocks null bytes

#### `validateUrl(url, required)`
Validates and normalizes URLs.

```javascript
import { validateUrl } from './utils/validator.js';

try {
  const url = validateUrl(userInput, false);
  // Returns: normalized URL or null if empty and not required
  place.website = url;
} catch (err) {
  showError(err.message);  // "Invalid URL format"
}
```

**Validation:**
- Blocks javascript:, data:, vbscript:, file:, about: protocols
- Adds https:// if no protocol provided
- Maximum 2000 characters
- Returns null if empty and not required

#### `validateText(text, maxLength, required)`
Validates text content (descriptions, comments).

```javascript
import { validateText } from './utils/validator.js';

try {
  const description = validateText(userInput, 1000, false);
  // Safe to store
} catch (err) {
  showError(err.message);
}
```

#### `validatePlaceSubmission(data)`
Validates an entire place submission object.

```javascript
import { validatePlaceSubmission } from './utils/validator.js';

try {
  const safeData = validatePlaceSubmission({
    name: formData.get('name'),
    website: formData.get('website'),
    submitter_email: formData.get('email'),
    more_info: formData.get('info')
  });

  // safeData is now validated and sanitized
  await submitToDatabase(safeData);
} catch (err) {
  showError(err.message);
}
```

---

## 📝 Usage Examples

### Example 1: Displaying User-Generated Content

```javascript
import { escapeHtml } from './utils/sanitizer.js';

// UNSAFE ❌
modalBody.innerHTML = `
  <div class="title">${place.name}</div>
  <div class="description">${place.description}</div>
`;

// SAFE ✅
modalBody.innerHTML = `
  <div class="title">${escapeHtml(place.name)}</div>
  <div class="description">${escapeHtml(place.description)}</div>
`;

// SAFEST ✅ (using DOM methods)
const titleEl = document.createElement('div');
titleEl.className = 'title';
titleEl.textContent = place.name;  // Automatically escaped

const descEl = document.createElement('div');
descEl.className = 'description';
descEl.textContent = place.description;

modalBody.appendChild(titleEl);
modalBody.appendChild(descEl);
```

### Example 2: Handling User Images

```javascript
import { createSafeImage, sanitizePhotoArray } from './utils/sanitizer.js';

// UNSAFE ❌
photos.forEach(url => {
  gallery.innerHTML += `<img src="${url}" />`;
});

// SAFE ✅
const safePhotos = sanitizePhotoArray(photos, 4);
safePhotos.forEach(url => {
  const img = createSafeImage(url, 'Photo');
  gallery.appendChild(img);
});
```

### Example 3: Form Validation

```javascript
import { validateEmail, validatePassword, validateName } from './utils/validator.js';

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    // Validate all fields
    const name = validateName(formData.get('name'), 2, 100);
    const email = validateEmail(formData.get('email'));
    const password = validatePassword(formData.get('password'));

    // All valid - proceed with signup
    await signupUser({ name, email, password });
  } catch (err) {
    // Show specific validation error
    statusEl.textContent = err.message;
  }
});
```

### Example 4: Safe Link Creation

```javascript
import { createSafeLink } from './utils/sanitizer.js';

// UNSAFE ❌
container.innerHTML = `<a href="${userUrl}">${userText}</a>`;

// SAFE ✅
const link = createSafeLink(userUrl, userText, 'external-link');
container.appendChild(link);
// Automatically blocks javascript: URLs
// Automatically adds rel="noopener noreferrer"
```

---

## 🧪 Testing

Open `test-sanitizer.html` in your browser to:

1. Run automated security tests
2. Try interactive XSS attacks (safely blocked)
3. Verify all sanitization functions work correctly

```bash
open utils/test-sanitizer.html
```

The test page demonstrates:
- ❌ UNSAFE innerHTML (shows vulnerability)
- ✅ SAFE innerHTML with escapeHtml
- ✅ SAFEST textContent approach

---

## 🚨 Common Vulnerabilities Prevented

### 1. XSS via Script Tags
```javascript
// Attack
const malicious = '<script>alert("XSS")</script>';

// Defense
element.innerHTML = escapeHtml(malicious);
// Result: &lt;script&gt;alert("XSS")&lt;/script&gt;
```

### 2. XSS via Image onerror
```javascript
// Attack
const malicious = '<img src=x onerror="alert(1)">';

// Defense
element.innerHTML = escapeHtml(malicious);
// Result: &lt;img src=x onerror="alert(1)"&gt;
```

### 3. XSS via JavaScript Protocol
```javascript
// Attack
link.href = 'javascript:alert("XSS")';

// Defense
const safe = sanitizeUrl('javascript:alert("XSS")');
// Result: '' (blocked)
```

### 4. XSS via Data URI
```javascript
// Attack
img.src = 'data:text/html,<script>alert(1)</script>';

// Defense
const safe = sanitizeUrl('data:text/html,<script>alert(1)</script>');
// Result: '' (blocked)
```

### 5. XSS via Event Handlers
```javascript
// Attack
const malicious = 'foo" onclick="alert(1)"';

// Defense
const safe = sanitizeAttribute(malicious);
// Result: foo&quot; onclick=&quot;alert(1)&quot;
```

---

## ✅ Security Checklist

Before deploying code that displays user content:

- [ ] Used `escapeHtml()` for all user content in innerHTML
- [ ] Or better: used `textContent` or `createSafeElement()`
- [ ] Used `sanitizeUrl()` for all user-provided URLs
- [ ] Used `createSafeImage()` for user-provided image URLs
- [ ] Used `createSafeLink()` for user-provided links
- [ ] Validated all form inputs with validator functions
- [ ] Tested with malicious inputs (use test-sanitizer.html)
- [ ] No direct innerHTML with user data anywhere in code

---

## 📚 Additional Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: textContent vs innerHTML](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## 🔄 Migration Guide

### Migrating Existing Code

**Step 1:** Import the utilities
```javascript
import { escapeHtml, createSafeElement } from './utils/sanitizer.js';
```

**Step 2:** Find all innerHTML usage
```bash
grep -r "innerHTML" src/
```

**Step 3:** Replace unsafe innerHTML
```javascript
// Before
element.innerHTML = `<div>${userInput}</div>`;

// After
element.innerHTML = `<div>${escapeHtml(userInput)}</div>`;
```

**Step 4:** Test thoroughly
- Open test-sanitizer.html
- Try malicious inputs in your forms
- Verify XSS attacks are blocked

---

## 💡 Pro Tips

1. **Prefer textContent over innerHTML**
   - textContent is automatically safe
   - innerHTML requires escaping
   - textContent is faster

2. **Use helper functions**
   - `createSafeElement()` is safer than manual escaping
   - `createSafeImage()` handles edge cases
   - `createSafeLink()` adds security attributes

3. **Validate early**
   - Validate at form submission
   - Don't wait until database storage
   - Show specific error messages

4. **Layer your security**
   - Validate input (validator.js)
   - Sanitize output (sanitizer.js)
   - Use Content Security Policy headers
   - Enable Supabase RLS policies

5. **Test with real attacks**
   - Use test-sanitizer.html regularly
   - Try OWASP XSS test strings
   - Test edge cases (empty strings, very long strings, unicode)

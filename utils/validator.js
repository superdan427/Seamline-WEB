// ============================================================================
// INPUT VALIDATION UTILITIES
// ============================================================================
// Provides validation functions for user inputs to prevent:
// - Invalid data entry
// - SQL injection (defense in depth)
// - XSS attacks
// - Buffer overflow attacks
//
// SECURITY: Always validate user input before processing or storing
// ============================================================================

/**
 * Validates an email address format
 *
 * @param {string} email - Email address to validate
 * @returns {string} Normalized email address (lowercase, trimmed)
 * @throws {Error} If email is invalid
 *
 * @example
 * const safeEmail = validateEmail(userInput);
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required');
  }

  const trimmed = email.trim();

  // Check minimum length
  if (trimmed.length < 3) {
    throw new Error('Email is too short');
  }

  // Check maximum length (RFC 5321)
  if (trimmed.length > 254) {
    throw new Error('Email is too long (maximum 254 characters)');
  }

  // Validate email format using RFC 5322 simplified regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email format');
  }

  // Check for dangerous characters (extra security)
  if (/[<>'"`;\\]/.test(trimmed)) {
    throw new Error('Email contains invalid characters');
  }

  // Return normalized (lowercase) email
  return trimmed.toLowerCase();
}

/**
 * Validates password strength
 *
 * @param {string} password - Password to validate
 * @returns {string} Validated password
 * @throws {Error} If password doesn't meet requirements
 *
 * @example
 * const safePassword = validatePassword(userInput);
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }

  // Minimum length
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Maximum length (prevent DoS via bcrypt)
  if (password.length > 128) {
    throw new Error('Password is too long (maximum 128 characters)');
  }

  // Must contain lowercase letter
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }

  // Must contain uppercase letter
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }

  // Must contain number
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }

  // Optional: Must contain special character
  // Uncomment to enforce special characters
  // if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
  //   throw new Error('Password must contain at least one special character');
  // }

  return password;
}

/**
 * Validates a name (display name, place name, etc.)
 *
 * @param {string} name - Name to validate
 * @param {number} minLength - Minimum length (default 1)
 * @param {number} maxLength - Maximum length (default 100)
 * @returns {string} Sanitized name
 * @throws {Error} If name is invalid
 *
 * @example
 * const safeName = validateName(userInput, 2, 50);
 */
export function validateName(name, minLength = 1, maxLength = 100) {
  if (!name || typeof name !== 'string') {
    throw new Error('Name is required');
  }

  const trimmed = name.trim();

  // Check minimum length
  if (trimmed.length < minLength) {
    throw new Error(`Name must be at least ${minLength} character(s)`);
  }

  // Check maximum length
  if (trimmed.length > maxLength) {
    throw new Error(`Name is too long (maximum ${maxLength} characters)`);
  }

  // Check for HTML/script tags (XSS prevention)
  const sanitized = trimmed.replace(/<[^>]*>/g, '');
  if (sanitized !== trimmed) {
    throw new Error('Name contains invalid characters (HTML tags not allowed)');
  }

  // Check for script injection attempts
  if (/javascript:/i.test(sanitized) || /<script/i.test(sanitized)) {
    throw new Error('Name contains invalid characters');
  }

  // Check for null bytes (security)
  if (sanitized.includes('\0')) {
    throw new Error('Name contains invalid characters');
  }

  return sanitized;
}

/**
 * Validates a URL
 *
 * @param {string} url - URL to validate
 * @param {boolean} required - Whether URL is required (default false)
 * @returns {string|null} Validated URL or null if empty and not required
 * @throws {Error} If URL is invalid
 *
 * @example
 * const safeUrl = validateUrl(userInput, false);
 */
export function validateUrl(url, required = false) {
  // Allow empty if not required
  if (!url || typeof url !== 'string' || !url.trim()) {
    if (required) {
      throw new Error('URL is required');
    }
    return null;
  }

  const trimmed = url.trim();

  // Check maximum length
  if (trimmed.length > 2000) {
    throw new Error('URL is too long (maximum 2000 characters)');
  }

  // Block dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file|about):/i;
  if (dangerousProtocols.test(trimmed)) {
    throw new Error('Invalid URL protocol');
  }

  // Must be a valid URL format
  try {
    // Add https:// if no protocol
    const urlWithProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    const urlObj = new URL(urlWithProtocol);

    // Only allow http and https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are allowed');
    }

    return urlWithProtocol;
  } catch (err) {
    throw new Error('Invalid URL format');
  }
}

/**
 * Validates a phone number
 *
 * @param {string} phone - Phone number to validate
 * @param {boolean} required - Whether phone is required (default false)
 * @returns {string|null} Sanitized phone or null if empty and not required
 * @throws {Error} If phone is invalid
 *
 * @example
 * const safePhone = validatePhone(userInput, false);
 */
export function validatePhone(phone, required = false) {
  // Allow empty if not required
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    if (required) {
      throw new Error('Phone number is required');
    }
    return null;
  }

  const trimmed = phone.trim();

  // Check length
  if (trimmed.length < 7) {
    throw new Error('Phone number is too short');
  }

  if (trimmed.length > 20) {
    throw new Error('Phone number is too long (maximum 20 characters)');
  }

  // Allow only numbers, spaces, hyphens, parentheses, plus sign
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  if (!phoneRegex.test(trimmed)) {
    throw new Error('Phone number contains invalid characters');
  }

  return trimmed;
}

/**
 * Validates text content (descriptions, comments, etc.)
 *
 * @param {string} text - Text to validate
 * @param {number} maxLength - Maximum length (default 1000)
 * @param {boolean} required - Whether text is required (default false)
 * @returns {string|null} Sanitized text or null if empty and not required
 * @throws {Error} If text is invalid
 *
 * @example
 * const safeText = validateText(userInput, 500, false);
 */
export function validateText(text, maxLength = 1000, required = false) {
  // Allow empty if not required
  if (!text || typeof text !== 'string' || !text.trim()) {
    if (required) {
      throw new Error('Text is required');
    }
    return null;
  }

  const trimmed = text.trim();

  // Check maximum length
  if (trimmed.length > maxLength) {
    throw new Error(`Text is too long (maximum ${maxLength} characters)`);
  }

  // Check for null bytes (security)
  if (trimmed.includes('\0')) {
    throw new Error('Text contains invalid characters');
  }

  return trimmed;
}

/**
 * Validates a number is within range
 *
 * @param {any} value - Value to validate as number
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Validated number
 * @throws {Error} If not a valid number or out of range
 *
 * @example
 * const safeRating = validateNumber(userInput, 1, 5);
 */
export function validateNumber(value, min = -Infinity, max = Infinity) {
  const num = Number(value);

  if (isNaN(num)) {
    throw new Error('Value must be a number');
  }

  if (!isFinite(num)) {
    throw new Error('Value must be finite');
  }

  if (num < min) {
    throw new Error(`Value must be at least ${min}`);
  }

  if (num > max) {
    throw new Error(`Value must be at most ${max}`);
  }

  return num;
}

/**
 * Validates a place submission object
 *
 * @param {Object} data - Submission data
 * @returns {Object} Validated and sanitized submission
 * @throws {Error} If validation fails
 *
 * @example
 * const safeSubmission = validatePlaceSubmission(formData);
 */
export function validatePlaceSubmission(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid submission data');
  }

  return {
    name: validateName(data.name, 2, 200),
    website: validateUrl(data.website, false),
    submitter_email: data.submitter_email ? validateEmail(data.submitter_email) : null,
    more_info: validateText(data.more_info, 1000, false),
  };
}

/**
 * Checks password strength and returns score
 *
 * @param {string} password - Password to check
 * @returns {Object} Strength info { strength: 'weak'|'medium'|'strong', score: number, feedback: Array<string> }
 *
 * @example
 * const strength = checkPasswordStrength(userInput);
 * if (strength.strength === 'weak') {
 *   alert('Please use a stronger password');
 * }
 */
export function checkPasswordStrength(password) {
  if (!password) {
    return { strength: 'weak', score: 0, feedback: ['Password is required'] };
  }

  let score = 0;
  const feedback = [];

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Determine strength
  let strength;
  if (score < 4) {
    strength = 'weak';
    feedback.push('Use at least 8 characters');
    feedback.push('Include uppercase, lowercase, and numbers');
  } else if (score < 6) {
    strength = 'medium';
    feedback.push('Good! Consider adding special characters for extra security');
  } else {
    strength = 'strong';
    feedback.push('Strong password!');
  }

  return { strength, score, feedback };
}

/**
 * Sanitizes and validates collection name
 *
 * @param {string} name - Collection name
 * @returns {string} Validated collection name
 * @throws {Error} If invalid
 *
 * @example
 * const safeName = validateCollectionName(userInput);
 */
export function validateCollectionName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Collection name is required');
  }

  const trimmed = name.trim();

  if (trimmed.length < 1) {
    throw new Error('Collection name cannot be empty');
  }

  if (trimmed.length > 50) {
    throw new Error('Collection name too long (maximum 50 characters)');
  }

  // Remove HTML tags
  const sanitized = trimmed.replace(/<[^>]*>/g, '');
  if (sanitized !== trimmed) {
    throw new Error('Collection name contains invalid characters');
  }

  return sanitized;
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*

// Email validation
try {
  const email = validateEmail(userInput);
  // Use email...
} catch (err) {
  showError(err.message);
}

// Password validation with strength check
try {
  const password = validatePassword(userInput);
  const strength = checkPasswordStrength(password);

  if (strength.strength === 'weak') {
    showWarning('Please use a stronger password');
  }

  // Proceed with signup...
} catch (err) {
  showError(err.message);
}

// Form validation
try {
  const validData = validatePlaceSubmission({
    name: formData.get('name'),
    website: formData.get('website'),
    submitter_email: formData.get('email'),
    more_info: formData.get('info')
  });

  // Submit validData to server...
} catch (err) {
  showError(err.message);
}

*/

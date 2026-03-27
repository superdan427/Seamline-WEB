// ============================================================================
// SANITIZATION UTILITIES
// ============================================================================
// Provides security functions to prevent XSS (Cross-Site Scripting) attacks
// by escaping/sanitizing user-generated content before displaying it.
//
// SECURITY: Always use these functions when displaying user content with innerHTML
// ============================================================================

/**
 * Escapes HTML special characters to prevent XSS attacks
 *
 * @param {any} unsafe - The untrusted string to escape
 * @returns {string} HTML-escaped string safe for innerHTML
 *
 * @example
 * const userInput = '<script>alert("XSS")</script>';
 * element.innerHTML = escapeHtml(userInput);
 * // Result: &lt;script&gt;alert("XSS")&lt;/script&gt;
 */
export function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';

  return String(unsafe)
    .replace(/&/g, "&amp;")    // Must be first to avoid double-escaping
    .replace(/</g, "&lt;")      // Prevents opening tags
    .replace(/>/g, "&gt;")      // Prevents closing tags
    .replace(/"/g, "&quot;")    // Prevents breaking out of attributes
    .replace(/'/g, "&#039;")    // Prevents breaking out of attributes
    .replace(/\//g, "&#x2F;");  // Extra safety for URLs
}

/**
 * Sanitizes a URL to prevent javascript:, data:, and vbscript: injection
 *
 * @param {string} url - The URL to sanitize
 * @returns {string} Sanitized URL or empty string if dangerous
 *
 * @example
 * sanitizeUrl('javascript:alert("XSS")') // Returns ''
 * sanitizeUrl('https://example.com')     // Returns 'https://example.com'
 * sanitizeUrl('example.com')             // Returns 'https://example.com'
 */
export function sanitizeUrl(url) {
  if (!url) return '';

  const urlStr = String(url).trim();

  // Block dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file|about):/i;
  if (dangerousProtocols.test(urlStr)) {
    console.warn('⚠️ Blocked dangerous URL protocol:', urlStr.substring(0, 50));
    return '';
  }

  // Allow safe protocols
  const safeProtocols = /^(https?|mailto|tel|sms):/i;
  if (safeProtocols.test(urlStr)) {
    return urlStr;
  }

  // If no protocol, assume https
  return `https://${urlStr}`;
}

/**
 * Removes all HTML tags from a string, leaving only text content
 * Useful for stripping any potential script tags or HTML injection
 *
 * @param {string} html - String potentially containing HTML
 * @returns {string} Text content only, no HTML tags
 *
 * @example
 * stripHtmlTags('<b>Hello</b> <script>alert("XSS")</script>')
 * // Returns: 'Hello '
 */
export function stripHtmlTags(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, '');
}

/**
 * Sanitizes HTML attributes by escaping quotes and special characters
 * Use this for dynamically generated HTML attributes
 *
 * @param {string} attr - Attribute value to sanitize
 * @returns {string} Sanitized attribute value
 *
 * @example
 * const userInput = 'foo" onclick="alert(1)"';
 * const html = `<div data-name="${sanitizeAttribute(userInput)}">`;
 * // Result: <div data-name="foo&quot; onclick=&quot;alert(1)&quot;">
 */
export function sanitizeAttribute(attr) {
  if (!attr) return '';

  return String(attr)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Creates a safe text node instead of using innerHTML
 * This is the SAFEST way to insert user content
 *
 * @param {HTMLElement} element - The parent element
 * @param {string} text - Text content to insert
 *
 * @example
 * // UNSAFE: element.innerHTML = userInput;
 * // SAFE:
 * setTextContent(element, userInput);
 */
export function setTextContent(element, text) {
  if (!element) return;

  // Clear existing content
  element.textContent = '';

  // Create and append text node (automatically escaped)
  const textNode = document.createTextNode(text || '');
  element.appendChild(textNode);
}

/**
 * Safely creates an element with text content
 * Returns a DOM element that's safe to append
 *
 * @param {string} tagName - HTML tag name (e.g., 'div', 'span', 'p')
 * @param {string} textContent - Text content (will be automatically escaped)
 * @param {string} className - Optional CSS class name
 * @returns {HTMLElement} Safe DOM element
 *
 * @example
 * const safeDiv = createSafeElement('div', userInput, 'my-class');
 * container.appendChild(safeDiv);
 */
export function createSafeElement(tagName, textContent = '', className = '') {
  const element = document.createElement(tagName);

  // textContent automatically escapes HTML
  element.textContent = textContent;

  if (className) {
    element.className = className;
  }

  return element;
}

/**
 * Safely creates an image element with sanitized src
 *
 * @param {string} src - Image URL
 * @param {string} alt - Alt text
 * @param {string} className - Optional CSS class
 * @returns {HTMLImageElement} Safe image element
 *
 * @example
 * const safeImg = createSafeImage(userImageUrl, 'User photo');
 * container.appendChild(safeImg);
 */
export function createSafeImage(src, alt = '', className = '') {
  const img = document.createElement('img');

  // Sanitize the URL to prevent javascript: protocol
  const safeSrc = sanitizeUrl(src);
  if (safeSrc) {
    img.src = safeSrc;
  } else {
    // If URL is dangerous, use a placeholder
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
    console.warn('⚠️ Blocked unsafe image URL');
  }

  // Alt text is automatically escaped by the browser
  img.alt = alt || '';

  if (className) {
    img.className = className;
  }

  // Prevent image from loading scripts (defense in depth)
  img.setAttribute('referrerpolicy', 'no-referrer');

  return img;
}

/**
 * Safely creates a link element with sanitized href
 *
 * @param {string} href - Link URL
 * @param {string} textContent - Link text
 * @param {string} className - Optional CSS class
 * @returns {HTMLAnchorElement} Safe link element
 *
 * @example
 * const safeLink = createSafeLink(userUrl, 'Visit website');
 * container.appendChild(safeLink);
 */
export function createSafeLink(href, textContent = '', className = '') {
  const link = document.createElement('a');

  // Sanitize the URL
  const safeHref = sanitizeUrl(href);
  if (safeHref) {
    link.href = safeHref;
  } else {
    // If URL is dangerous, don't set href
    link.href = '#';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      console.warn('⚠️ Blocked unsafe link');
    });
  }

  // textContent is automatically escaped
  link.textContent = textContent;

  if (className) {
    link.className = className;
  }

  // Security: Open external links in new tab with noopener noreferrer
  if (safeHref && (safeHref.startsWith('http://') || safeHref.startsWith('https://'))) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  return link;
}

/**
 * Validates that a string contains only safe characters
 * Useful for names, titles, etc.
 *
 * @param {string} str - String to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 * @throws {Error} If string contains dangerous characters
 *
 * @example
 * const safeName = validateSafeString(userInput, 100);
 */
export function validateSafeString(str, maxLength = 500) {
  if (!str) return '';

  const trimmed = String(str).trim();

  // Check length
  if (trimmed.length > maxLength) {
    throw new Error(`String too long (max ${maxLength} characters)`);
  }

  // Check for HTML tags
  if (/<[^>]*>/g.test(trimmed)) {
    throw new Error('HTML tags are not allowed');
  }

  // Check for script-like content
  if (/javascript:/i.test(trimmed) || /<script/i.test(trimmed)) {
    throw new Error('Script content is not allowed');
  }

  return trimmed;
}

/**
 * Builds HTML safely using a template with escaped values
 *
 * @param {string} template - HTML template with {{placeholders}}
 * @param {Object} values - Object with values to inject
 * @returns {string} Safe HTML string
 *
 * @example
 * const html = buildSafeHtml(
 *   '<div class="card"><h2>{{title}}</h2><p>{{description}}</p></div>',
 *   { title: userInput, description: userDescription }
 * );
 */
export function buildSafeHtml(template, values) {
  let result = template;

  for (const [key, value] of Object.entries(values)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, escapeHtml(value));
  }

  return result;
}

/**
 * Sanitizes an array of photo URLs
 * Filters out dangerous URLs and returns only safe ones
 *
 * @param {Array<string>} photos - Array of photo URLs
 * @param {number} maxCount - Maximum number of photos to return
 * @returns {Array<string>} Array of sanitized photo URLs
 *
 * @example
 * const safePhotos = sanitizePhotoArray(place.photos, 4);
 */
export function sanitizePhotoArray(photos, maxCount = 10) {
  if (!Array.isArray(photos)) return [];

  return photos
    .slice(0, maxCount)
    .map(url => sanitizeUrl(url))
    .filter(url => url !== ''); // Remove any blocked URLs
}

/**
 * Security test function - DO NOT USE IN PRODUCTION
 * Tests if sanitization is working correctly
 *
 * @returns {Object} Test results
 */
export function __testSanitizer() {
  const tests = [
    {
      name: 'HTML Escaping',
      input: '<script>alert("XSS")</script>',
      expected: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;',
      result: escapeHtml('<script>alert("XSS")</script>')
    },
    {
      name: 'JavaScript URL Blocking',
      input: 'javascript:alert("XSS")',
      expected: '',
      result: sanitizeUrl('javascript:alert("XSS")')
    },
    {
      name: 'Data URL Blocking',
      input: 'data:text/html,<script>alert("XSS")</script>',
      expected: '',
      result: sanitizeUrl('data:text/html,<script>alert("XSS")</script>')
    },
    {
      name: 'Safe HTTPS URL',
      input: 'https://example.com',
      expected: 'https://example.com',
      result: sanitizeUrl('https://example.com')
    },
    {
      name: 'URL Without Protocol',
      input: 'example.com',
      expected: 'https://example.com',
      result: sanitizeUrl('example.com')
    }
  ];

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  tests.forEach(test => {
    const passed = test.result === test.expected;
    results.tests.push({
      ...test,
      passed
    });

    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  });

  return results;
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*

// ❌ UNSAFE - Vulnerable to XSS
element.innerHTML = `<div>${userInput}</div>`;

// ✅ SAFE - Option 1: Use escapeHtml
element.innerHTML = `<div>${escapeHtml(userInput)}</div>`;

// ✅ SAFE - Option 2: Use textContent (BEST)
const div = document.createElement('div');
div.textContent = userInput;
element.appendChild(div);

// ✅ SAFE - Option 3: Use createSafeElement
const safeDiv = createSafeElement('div', userInput);
element.appendChild(safeDiv);

// ❌ UNSAFE - Image with user URL
img.src = userImageUrl;

// ✅ SAFE - Sanitize URL first
const safeImg = createSafeImage(userImageUrl, 'Photo');
element.appendChild(safeImg);

// ❌ UNSAFE - Link with user URL
link.href = userUrl;

// ✅ SAFE - Use createSafeLink
const safeLink = createSafeLink(userUrl, 'Visit website');
element.appendChild(safeLink);

*/

// ============================================================================
// PLACE SUBMISSION SYSTEM
// ============================================================================
// Allows authenticated users to submit new places for review
// Includes geocoding, validation, and security measures
// ============================================================================

import { supabase } from './supabaseClient.js';
import { getCurrentUser, getCurrentUserAsync } from '../utils/storage.js';
import { validateName, validateUrl, validateText, validatePhone } from '../utils/validator.js';

const form = document.getElementById('submit-form');
const formContainer = document.getElementById('form-container');
const successMessage = document.getElementById('success-message');
const errorContainer = document.getElementById('error-container');
const charCount = document.getElementById('char-count');
const submitBtn = document.getElementById('submit-btn');

// ============================================================================
// CHARACTER COUNTER
// ============================================================================

document.getElementById('pop_up')?.addEventListener('input', (e) => {
  const length = e.target.value.length;
  const maxLength = 200;
  const minLength = 100;

  charCount.textContent = `${length} / ${maxLength} characters`;

  // Color coding
  charCount.classList.remove('warning', 'error');
  if (length < minLength) {
    charCount.classList.add('error');
    charCount.textContent = `${length} / ${maxLength} characters (minimum ${minLength} required)`;
  } else if (length >= maxLength - 20) {
    charCount.classList.add('warning');
  }
});

// ============================================================================
// LOAD TAGS FROM EXISTING PLACES
// ============================================================================

async function loadTags() {
  try {
    const { data: places, error } = await supabase
      .from('places')
      .select('tags')
      .not('tags', 'is', null);

    if (error) throw error;

    // Extract all unique tags
    const allTags = new Set();
    places?.forEach((place) => {
      if (Array.isArray(place.tags)) {
        place.tags.forEach((tag) => allTags.add(tag));
      }
    });

    // Render tag checkboxes
    const tagsContainer = document.getElementById('tags-container');
    if (tagsContainer && allTags.size > 0) {
      Array.from(allTags)
        .sort()
        .forEach((tag) => {
          const label = document.createElement('label');

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.name = 'tags';
          checkbox.value = tag;

          // Security: Use textContent to prevent XSS
          const span = document.createElement('span');
          span.textContent = tag;

          label.appendChild(checkbox);
          label.appendChild(span);
          tagsContainer.appendChild(label);
        });
    }
  } catch (error) {
    console.error('Error loading tags:', error);
    // Non-critical error, continue without tags
  }
}

// ============================================================================
// GEOCODE ADDRESS USING MAPBOX API
// ============================================================================

async function geocodeAddress(address) {
  // Security: Use token from config
  const accessToken = window.MAPBOX_TOKEN;

  if (!accessToken) {
    throw new Error('Mapbox token not configured');
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address
  )}.json?access_token=${accessToken}&limit=1`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Could not find location. Please check the address and try again.');
  }
}

// ============================================================================
// SHOW ERROR MESSAGE
// ============================================================================

function showError(message) {
  errorContainer.textContent = message;
  errorContainer.classList.remove('hidden');

  // Scroll to top to show error
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Auto-hide after 10 seconds
  setTimeout(() => {
    errorContainer.classList.add('hidden');
  }, 10000);
}

function hideError() {
  errorContainer.classList.add('hidden');
}

// ============================================================================
// FORM SUBMISSION HANDLER
// ============================================================================

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  // Check authentication
  const user = getCurrentUser() || (await getCurrentUserAsync());
  if (!user) {
    showError('Please sign in to submit a place. Redirecting to login...');
    setTimeout(() => {
      window.location.href = 'account.html';
    }, 2000);
    return;
  }

  // Disable submit button to prevent double submission
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const formData = new FormData(form);

    // ========================================================================
    // VALIDATE ALL INPUTS (SECURITY)
    // ========================================================================

    // Validate required fields
    const name = validateName(formData.get('name'), 2, 200);
    const category = formData.get('category');
    const address = formData.get('address')?.trim();

    if (!category) {
      throw new Error('Please select a category');
    }

    if (!address || address.length < 5) {
      throw new Error('Please enter a valid address');
    }

    // Validate optional URL
    const websiteInput = formData.get('website')?.trim();
    const website = websiteInput ? validateUrl(websiteInput, false) : null;

    // Validate optional phone
    const phoneInput = formData.get('phone')?.trim();
    const phone = phoneInput ? validatePhone(phoneInput, false) : null;

    // Validate description
    const pop_up = validateText(formData.get('pop_up'), 200, true);
    if (pop_up.length < 100) {
      throw new Error('Brief description must be at least 100 characters');
    }

    // Validate optional fields
    const opening_hours = validateText(formData.get('opening_hours'), 1000, false);
    const more_info = validateText(formData.get('more_info'), 2000, false);
    const average_price = validateText(formData.get('average_price'), 100, false);

    // ========================================================================
    // GEOCODE ADDRESS
    // ========================================================================

    submitBtn.textContent = 'Finding location...';
    const coords = await geocodeAddress(address);

    if (!coords) {
      throw new Error('Could not find location. Please check the address and try again.');
    }

    // ========================================================================
    // COLLECT SELECTED TAGS
    // ========================================================================

    const selectedTags = Array.from(form.querySelectorAll('input[name="tags"]:checked'))
      .map((checkbox) => checkbox.value);

    // ========================================================================
    // PREPARE SUBMISSION DATA
    // ========================================================================

    const placeData = {
      // Required fields
      name,
      category,
      address,
      pop_up,
      lat: coords.lat,
      lng: coords.lng,

      // Optional fields
      website: website || null,
      phone: phone || null,
      opening_hours: opening_hours || null,
      more_info: more_info || null,
      average_price: average_price || null,
      tags: selectedTags.length > 0 ? selectedTags : null,

      // Approval fields
      approved: false,
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),

      // Slug will be generated after approval
      slug: null,
    };

    // ========================================================================
    // SUBMIT TO DATABASE
    // ========================================================================

    submitBtn.textContent = 'Saving...';

    const { data, error } = await supabase
      .from('places')
      .insert([placeData])
      .select()
      .single();

    if (error) {
      console.error('Submission error:', error);
      throw new Error(error.message || 'Failed to submit place. Please try again.');
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================

    console.log('✅ Place submitted successfully:', data);

    // Hide form, show success message
    formContainer.classList.add('hidden');
    successMessage.classList.remove('hidden');

    // Scroll to top to show success message
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (error) {
    console.error('Submission error:', error);
    showError(error.message || 'Something went wrong. Please try again.');

    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Place';
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Load tags when page loads
loadTags();

// Check if user is authenticated on page load
(async () => {
  const user = getCurrentUser() || (await getCurrentUserAsync());
  if (!user) {
    const signInPrompt = document.createElement('div');
    signInPrompt.className = 'error-message';
    signInPrompt.innerHTML = `
      <strong>⚠️ Sign In Required</strong>
      <p>You need to be signed in to submit a place.</p>
      <p><a href="account.html" style="color: #dc3545; text-decoration: underline;">Click here to sign in or create an account</a></p>
    `;

    // Insert before form
    formContainer.insertBefore(signInPrompt, form);

    // Disable form
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sign In Required';
  }
})();

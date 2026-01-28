# Security Setup Guide

## 🚨 CRITICAL: Exposed Secrets - Immediate Actions Required

### ⚠️ YOUR SERVICE ROLE KEY WAS EXPOSED IN CODE

**The service role key in your code has full database access and was publicly visible.**

**IMMEDIATE ACTION REQUIRED:**

1. **Rotate your Supabase Service Role Key NOW:**
   - Go to: https://app.supabase.com/project/_/settings/api
   - Under "service_role key (secret)", click "Generate new key"
   - Copy the new key
   - Update `.env` file with the new key
   - **The old key is compromised and should be revoked**

2. **Review your Supabase audit logs:**
   - Check for any suspicious database activity
   - Look for unexpected queries or data modifications

---

## 📋 Environment Variables Setup

This codebase now uses environment variables to protect sensitive API keys and secrets.

### For Local Development

#### 1. Install Dependencies (for server-side scripts)

```bash
npm install
```

This installs:
- `@supabase/supabase-js` - Supabase JavaScript client
- `dotenv` - Loads environment variables from .env file

#### 2. Create Configuration Files

**For server-side scripts (Node.js):**

```bash
# Create .env file from template
cp .env.example .env
```

Then edit `.env` and add your actual credentials:
```bash
SUPABASE_URL=https://vnorasexpaddfkznlbjn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here
```

**For client-side (browser):**

```bash
# Create config.local.js from template
cp config.example.js config.local.js
```

Then edit `config.local.js` and add your actual credentials.

#### 3. Verify Setup

Test the configuration:

```bash
# Test server-side script
npm run import-places

# Test client-side - open index.html in browser
# Check browser console for "✓ Loaded configuration from config.local.js"
```

---

## 🔐 Security Best Practices

### Files That Should NEVER Be Committed

The following files are now in `.gitignore` and contain sensitive data:

- `.env` - Contains service role key (server-side)
- `config.local.js` - Contains API keys (client-side)
- `.env.local`, `.env.*.local` - Any local environment overrides

### Files That ARE Safe to Commit

- `.env.example` - Template with placeholder values
- `config.example.js` - Template with placeholder values
- `config.js` - Smart loader that tries to load config.local.js
- `.gitignore` - Protects sensitive files

### API Key Security Levels

1. **Supabase ANON Key** (in `config.local.js`)
   - ✅ Safe to use in client-side code
   - ✅ Designed for public exposure
   - ⚠️ Security relies on Row Level Security (RLS) policies
   - 🔒 Ensure RLS policies are properly configured

2. **Supabase SERVICE ROLE Key** (in `.env`)
   - ❌ NEVER use in client-side code
   - ❌ NEVER commit to Git
   - ❌ Bypasses ALL Row Level Security
   - 🔒 Only use in server-side scripts
   - 🔒 Keep absolutely secret

3. **Mapbox Token** (in `config.local.js`)
   - ⚠️ Limit exposure risk
   - 🔒 Set URL restrictions in Mapbox dashboard
   - 🔒 Set rate limits to prevent abuse

---

## 🚀 Deployment Setup

### For Production (Netlify, Vercel, etc.)

#### Option 1: Build-time Environment Variables

If using a build tool (Vite, webpack, etc.):

```bash
# Set environment variables in hosting platform
VITE_SUPABASE_URL=https://vnorasexpaddfkznlbjn.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_MAPBOX_TOKEN=your_mapbox_token
```

Then update `config.js` to use:
```javascript
window.SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
window.SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
window.MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
```

#### Option 2: Manual Replacement (Static Hosting)

For static hosting without build step:

1. Create a production version of `config.local.js`
2. Replace placeholders with actual values during deployment
3. Use deployment scripts to inject values

Example deployment script:
```bash
#!/bin/bash
# deploy.sh

# Copy template
cp config.example.js config.local.js

# Replace with actual values (from environment)
sed -i "s|your_supabase_anon_key_here|$SUPABASE_ANON_KEY|g" config.local.js
sed -i "s|your_mapbox_token_here|$MAPBOX_TOKEN|g" config.local.js

# Deploy
# ... your deployment commands ...
```

---

## ✅ Security Checklist

### Before Committing Code

- [ ] No API keys in committed files
- [ ] `.env` is in `.gitignore`
- [ ] `config.local.js` is in `.gitignore`
- [ ] Only template files (`.example`) are committed
- [ ] Sensitive keys are rotated if previously exposed

### Before Deploying to Production

- [ ] Service role key has been rotated
- [ ] Supabase RLS policies are enabled and tested
- [ ] Mapbox token has URL restrictions
- [ ] Environment variables configured in hosting platform
- [ ] Tested configuration loading in production environment
- [ ] No console.log statements exposing sensitive data

### Regular Security Maintenance

- [ ] Rotate API keys every 90 days
- [ ] Review Supabase audit logs monthly
- [ ] Monitor API usage for anomalies
- [ ] Keep dependencies updated
- [ ] Review and update RLS policies as needed

---

## 🆘 Troubleshooting

### "Config not found" Error

**Problem:** Browser console shows "config.local.js not found"

**Solution:**
```bash
cp config.example.js config.local.js
# Edit config.local.js with your actual keys
```

### "Missing required environment variables" Error

**Problem:** Node script fails with missing env vars

**Solution:**
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### Map Not Loading

**Problem:** Map doesn't render or shows "token required" error

**Solution:**
1. Check browser console for errors
2. Verify `config.local.js` has valid `MAPBOX_TOKEN`
3. Verify Mapbox token is valid in dashboard
4. Check URL restrictions in Mapbox settings

### Supabase Connection Fails

**Problem:** Database queries fail or return unauthorized

**Solution:**
1. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `config.local.js`
2. Check Supabase project status
3. Verify RLS policies allow the operation
4. Check browser network tab for 401/403 errors

---

## 📚 Additional Resources

- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Mapbox Token Management](https://docs.mapbox.com/help/troubleshooting/how-to-use-mapbox-securely/)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

## 🔄 Migration Checklist

If you're migrating from the old hardcoded setup:

- [x] Created `.gitignore`
- [x] Created `.env.example`
- [x] Created `config.example.js`
- [x] Created `.env` with actual credentials
- [x] Created `config.local.js` with actual credentials
- [x] Updated `config.js` to load from `config.local.js`
- [x] Updated `map/map.js` to use `window.MAPBOX_TOKEN`
- [x] Updated `src/import-places.js` to use environment variables
- [x] Updated `package.json` with dependencies
- [ ] **Rotated Supabase service role key** (YOU MUST DO THIS!)
- [ ] Tested local development setup
- [ ] Configured production environment variables
- [ ] Tested production deployment

---

**⚠️ REMEMBER: Your service role key was exposed. Rotate it immediately!**

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { config } from 'dotenv';

// Load environment variables from .env file
// Security: .env is gitignored and should NEVER be committed
config();

// Read the places.json file
const placesData = JSON.parse(fs.readFileSync('../data/places.json', 'utf8'));

// Load Supabase credentials from environment variables
// Security: Service role key bypasses Row Level Security - keep it SECRET!
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables!');
  console.error('   Please ensure .env file exists with:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Copy .env.example to .env and fill in your credentials.');
  process.exit(1);
}

// Create Supabase client with service role key
// Warning: This key has FULL database access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importPlaces() {
  console.log(`Starting import of ${placesData.length} places...`);
  
  // Transform the data
  const placesToInsert = placesData.map(place => ({
    slug: place.id,           // Original text ID becomes slug
    name: place.name,
    address: place.address || null,
    category: place.category,
    phone: place.phone || null,
    website: place.website || null,
    opening_hours: place.opening_hours || null,
    pop_up: place.pop_up || null,
    lat: place.lat ? parseFloat(place.lat) : null,
    lng: place.lng ? parseFloat(place.lng) : null,
    tags: place.tags || [],
    more_info: place.more_info || null,
    average_price: place.average_price || null,
    been: place.been === 'YES',
    approved: place.approved === 'YES',
    overall: place.overall || null,
    type: place.type || null,
    normalized_domain: place.normalized_domain || null
  }));

  // Import in batches of 50 to avoid timeouts
  const batchSize = 50;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < placesToInsert.length; i += batchSize) {
    const batch = placesToInsert.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('places')
      .upsert(batch, { onConflict: 'slug' }) // Skip duplicates by slug
      .select();

    if (error) {
      console.error(`❌ Error importing batch ${i / batchSize + 1}:`, error.message);
      errors += batch.length;
    } else {
      imported += data.length;
      console.log(`✅ Batch ${i / batchSize + 1}: Imported ${data.length} places (${imported} total)`);
    }
  }

  console.log(`\n📊 Final results:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Errors: ${errors}`);
  
  // Verify import
  const { count } = await supabase
    .from('places')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   Total in database: ${count}`);
}

importPlaces().catch(console.error);

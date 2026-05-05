
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fmyklzetlukvikmhyjdx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZteWtsemV0bHVrdmlrbWh5amR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODMwNzIsImV4cCI6MjA4NjQ1OTA3Mn0.0TZFEIXwLl2Hv6jlNwgPhzltqxXXilHe1FHZh924M28';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAPI() {
  const santriIdInt = 15;
  const { data: payments, error: paymentsError } = await supabase
    .from('pembayaran')
    .select(`
        id,
        total_tagihan,
        dibayarkan,
        created_at,
        tagihan_batch (
            id,
            bulan,
            tahun,
            spp,
            kebersihan,
            konsumsi,
            pembangunan,
            total
        )
    `)
    .eq('santri_id', santriIdInt);
    
  if (paymentsError) {
    console.error('API Error:', paymentsError);
  } else {
    console.log('API Success:', payments);
  }
}

debugAPI();

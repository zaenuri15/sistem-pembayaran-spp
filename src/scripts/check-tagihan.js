
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fmyklzetlukvikmhyjdx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZteWtsemV0bHVrdmlrbWh5amR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODMwNzIsImV4cCI6MjA4NjQ1OTA3Mn0.0TZFEIXwLl2Hv6jlNwgPhzltqxXXilHe1FHZh924M28';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTagihanBatch() {
  const { data, error } = await supabase
    .from('tagihan_batch')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Tagihan batch sample:', data);
  }
}

checkTagihanBatch();

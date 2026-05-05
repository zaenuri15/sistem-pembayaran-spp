
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fmyklzetlukvikmhyjdx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZteWtsemV0bHVrdmlrbWh5amR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODMwNzIsImV4cCI6MjA4NjQ1OTA3Mn0.0TZFEIXwLl2Hv6jlNwgPhzltqxXXilHe1FHZh924M28';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'santri' });
  if (error) {
    // If rpc doesn't exist, try a simple select
    const { data: testData, error: testError } = await supabase.from('santri').select('id').limit(1);
    console.log('Select with anon key success:', !!testData);
    if (testError) console.error('Select error:', testError);
  } else {
    console.log('Policies:', data);
  }
}

checkRLS();

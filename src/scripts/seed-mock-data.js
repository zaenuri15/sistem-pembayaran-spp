/**
 * Database Seeder Utility Script
 * Sistem Informasi Pembayaran SPP - PP Inayatullah
 *
 * Menambahkan data contoh (mock data) santri baru secara cerdas.
 * Secara otomatis menautkan pembayaran baru ke batch tagihan tahun berjalan
 * sehingga menu filter dan laporan di dashboard terisi dengan visual yang indah.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fmyklzetlukvikmhyjdx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZteWtsemV0bHVrdmlrbWh5amR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODMwNzIsImV4cCI6MjA4NjQ1OTA3Mn0.0TZFEIXwLl2Hv6jlNwgPhzltqxXXilHe1FHZh924M28';
const supabase = createClient(supabaseUrl, supabaseKey);

const MOCK_SANTRI = [
    {
        nis: '2601002',
        nama: 'Ahmad Fauzi',
        jenis_kelamin: 'L',
        tanggal_lahir: '2004-05-12',
        password: '120504',
        kelas: "Ibtida'",
        alamat: 'Sleman, Yogyakarta',
        nama_wali: 'Slamet',
        email: 'ahmatnuri0301@gmail.com' // Gunakan email terkonfigurasi Gmail untuk testing kwitansi
    },
    {
        nis: '2601003',
        nama: 'Budi Utomo',
        jenis_kelamin: 'L',
        tanggal_lahir: '2005-02-20',
        password: '200205',
        kelas: 'Jurumiyah',
        alamat: 'Bantul, Yogyakarta',
        nama_wali: 'Hariyanto',
        email: 'budiutomo.test@gmail.com'
    },
    {
        nis: '2602004',
        nama: 'Fatimah Az-Zahra',
        jenis_kelamin: 'P',
        tanggal_lahir: '2003-08-15',
        password: '150803',
        kelas: 'Imrithi',
        alamat: 'Solo, Jawa Tengah',
        nama_wali: 'Zainuddin',
        email: 'fatimah.test@gmail.com'
    }
];

async function seedDatabase() {
    console.log('\n======================================================');
    console.log('       MEMULAI SEEDING DATA SIMULASI SUPABASE         ');
    console.log('======================================================\n');

    try {
        // 1. Ambil batch tagihan yang ada di database
        const { data: batches, error: batchError } = await supabase
            .from('tagihan_batch')
            .select('id, total, tahun');

        if (batchError) {
            console.error('Error fetching batches:', batchError.message);
            return;
        }

        console.log(`[OK] Ditemukan ${batches?.length || 0} batch tagihan aktif.`);

        // 2. Suntik data santri secara selektif (hindari duplikasi NIS)
        for (const santri of MOCK_SANTRI) {
            const { data: existing } = await supabase
                .from('santri')
                .select('id')
                .eq('nis', santri.nis)
                .maybeSingle();

            if (existing) {
                console.log(`[SKIP] Santri ${santri.nama} (${santri.nis}) sudah terdaftar.`);
                continue;
            }

            const { data: newSantri, error: insertError } = await supabase
                .from('santri')
                .insert([santri])
                .select()
                .single();

            if (insertError) {
                console.error(`[ERROR] Gagal input ${santri.nama}:`, insertError.message);
                continue;
            }

            console.log(`[INSERTED] Santri ${newSantri.nama} berhasil didaftarkan dengan NIS ${newSantri.nis}.`);

            // 3. Buat record pembayaran otomatis untuk santri baru tersebut
            if (batches && batches.length > 0) {
                const currentYear = new Date().getFullYear();
                const currentYearBatches = batches.filter(b => b.tahun === currentYear);

                if (currentYearBatches.length > 0) {
                    const paymentPayloads = currentYearBatches.map(batch => ({
                        santri_id: newSantri.id,
                        tagihan_batch_id: batch.id,
                        total_tagihan: batch.total,
                        dibayarkan: 0
                    }));

                    const { error: paymentError } = await supabase
                        .from('pembayaran')
                        .insert(paymentPayloads);

                    if (paymentError) {
                        console.error(`  [ERROR] Gagal generate pembayaran bulanan untuk ${newSantri.nama}:`, paymentError.message);
                    } else {
                        console.log(`  [PAYMENTS GENERATED] Berhasil membuat ${paymentPayloads.length} record tagihan bulanan untuk ${newSantri.nama}.`);
                    }
                }
            }
        }

        console.log('\n======================================================');
        console.log('       PROSES SEEDING DATA CONTOH SELESAI             ');
        console.log('======================================================\n');

    } catch (err) {
        console.error('Terjadi kesalahan fatal saat seeding:', err.message);
    }
}

seedDatabase();

/**
 * Automated System API Integration Testing Script
 * Sistem Informasi Pembayaran SPP - PP Inayatullah
 *
 * Menjalankan 7 skenario pengujian fungsionalitas rute-rute API backend Next.js
 * secara dinamis dengan request HTTP nyata ke server pengembangan lokal (http://localhost:3000).
 */

const BASE_URL = 'http://localhost:3000';

async function runAPITests() {
    console.log('\n======================================================');
    console.log('  MEMULAI PENGUJIAN OTOMATIS API INTEGRASI SYSTEM      ');
    console.log('  Target: ' + BASE_URL);
    console.log('======================================================\n');

    let totalTests = 0;
    let passedTests = 0;

    function reportResult(name, success, info = '') {
        totalTests++;
        if (success) {
            passedTests++;
            console.log(`[PASS] [${totalTests}] ${name} ${info ? `(${info})` : ''}`);
        } else {
            console.log(`\x1b[31m[FAIL] [${totalTests}] ${name} \x1b[0m ${info ? `- Detail: ${info}` : ''}`);
        }
    }

    // ----------------------------------------------------
    // TEST 1: Login Admin Valid
    // ----------------------------------------------------
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin' })
        });
        const result = await response.json();
        
        reportResult(
            'Login Admin (Kredensial Valid)',
            response.status === 200 && result.success && result.data.role === 'admin',
            `Status: ${response.status}, Role: ${result.data?.role}`
        );
    } catch (err) {
        reportResult('Login Admin (Kredensial Valid)', false, err.message);
    }

    // ----------------------------------------------------
    // TEST 2: Login Admin Invalid
    // ----------------------------------------------------
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password_salah' })
        });
        const result = await response.json();
        
        reportResult(
            'Login Admin (Kredensial Tidak Valid)',
            response.status === 401 && !result.success,
            `Status: ${response.status} (Diharapkan 401), Pesan: ${result.error}`
        );
    } catch (err) {
        reportResult('Login Admin (Kredensial Tidak Valid)', false, err.message);
    }

    // ----------------------------------------------------
    // TEST 3: Login Santri Valid (NIS Rahmadani: 2602001)
    // ----------------------------------------------------
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: '2602001', password: '281003' })
        });
        const result = await response.json();
        
        reportResult(
            'Login Santri (NIS & Password Valid)',
            response.status === 200 && result.success && result.data.role === 'santri',
            `Status: ${response.status}, Nama Santri: ${result.data?.user?.nama}`
        );
    } catch (err) {
        reportResult('Login Santri (NIS & Password Valid)', false, err.message);
    }

    // ----------------------------------------------------
    // TEST 4: Login Wali Valid (Wali Rahmadani: Nasrudhin)
    // ----------------------------------------------------
    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Nasrudhin', password: '281003' })
        });
        const result = await response.json();
        
        reportResult(
            'Login Wali Santri (Nama Wali & Password Valid)',
            response.status === 200 && result.success && result.data.role === 'wali',
            `Status: ${response.status}, Wali Anak: ${result.data?.user?.santri_nama}`
        );
    } catch (err) {
        reportResult('Login Wali Santri (Nama Wali & Password Valid)', false, err.message);
    }

    // ----------------------------------------------------
    // TEST 5: GET Data Santri API
    // ----------------------------------------------------
    try {
        const response = await fetch(`${BASE_URL}/api/santri`);
        const result = await response.json();
        
        reportResult(
            'API GET /api/santri (Ambil Daftar Santri)',
            response.status === 200 && result.success && Array.isArray(result.data),
            `Jumlah Santri Terdaftar: ${result.data?.length || 0} orang`
        );
    } catch (err) {
        reportResult('API GET /api/santri (Ambil Daftar Santri)', false, err.message);
    }

    // ----------------------------------------------------
    // TEST 6: GET Tagihan Batches API
    // ----------------------------------------------------
    try {
        const response = await fetch(`${BASE_URL}/api/tagihan`);
        const result = await response.json();
        
        reportResult(
            'API GET /api/tagihan (Ambil Batch Tagihan Keuangan)',
            response.status === 200 && result.success && Array.isArray(result.data),
            `Jumlah Batch Tagihan: ${result.data?.length || 0} batch`
        );
    } catch (err) {
        reportResult('API GET /api/tagihan (Ambil Batch Tagihan Keuangan)', false, err.message);
    }

    // ----------------------------------------------------
    // TEST 7: GET Pembayaran Keuangan API
    // ----------------------------------------------------
    try {
        const response = await fetch(`${BASE_URL}/api/pembayaran`);
        const result = await response.json();
        
        reportResult(
            'API GET /api/pembayaran (Ambil Status Transaksi Keuangan)',
            response.status === 200 && result.success && Array.isArray(result.data),
            `Jumlah Record Pembayaran: ${result.data?.length || 0} transaksi`
        );
    } catch (err) {
        reportResult('API GET /api/pembayaran (Ambil Status Transaksi Keuangan)', false, err.message);
    }

    console.log('\n======================================================');
    console.log('              KESIMPULAN HASIL PENGUJIAN API          ');
    console.log(`  Total Skenario Kasus Uji  : ${totalTests}`);
    console.log(`  Jumlah Kasus Sukses (PASS): ${passedTests}`);
    console.log(`  Jumlah Kasus Gagal (FAIL) : ${totalTests - passedTests}`);
    console.log('======================================================\n');
}

runAPITests();

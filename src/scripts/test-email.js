/**
 * Real-time Nodemailer Kwitansi Email Verification Script
 * Sistem Informasi Pembayaran SPP - PP Inayatullah
 *
 * Membaca kredensial Gmail dari .env.local secara aman, kemudian mengirimkan
 * email kwitansi SPP tiruan berformat HTML ke inbox Gmail Anda untuk memverifikasi
 * kelancaran integrasi SMTP server.
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

function parseEnvLocal() {
    const envPath = path.join(__dirname, '..', '..', '.env.local');
    if (!fs.existsSync(envPath)) {
        throw new Error('.env.local file not found at: ' + envPath);
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const config = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = match[2] || '';
            // Remove surrounding quotes if any
            if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
                value = value.substring(1, value.length - 1);
            }
            config[match[1]] = value;
        }
    });
    return config;
}

async function sendTestReceipt() {
    console.log('\n======================================================');
    console.log('       MEMULAI PENGUJIAN EMAIL KWITANSI NODEMAILER    ');
    console.log('======================================================\n');

    try {
        // 1. Load credentials
        console.log('[1/4] Membaca berkas kredensial .env.local...');
        const env = parseEnvLocal();
        const userGmail = env.GMAIL_USER;
        const passGmail = env.GMAIL_APP_PASSWORD;

        if (!userGmail || !passGmail) {
            console.error('\x1b[31m[ERROR] GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env.local!\x1b[0m');
            return;
        }
        console.log(`      Gmail: ${userGmail}`);
        console.log(`      App Password: (Terkonfigurasi)`);

        // 2. Setup Transporter
        console.log('[2/4] Menghubungkan ke SMTP Google...');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: userGmail,
                pass: passGmail,
            },
        });

        // 3. Construct HTML Template (official PPI theme)
        console.log('[3/4] Menyusun template HTML Kwitansi...');
        const namaSantri = 'Ahmad Fauzi (Test)';
        const nis = '2601002';
        const kelas = "Ibtida'";
        const bulan = 'Mei';
        const tahun = '2026';
        const nominalBayar = 100000;
        const totalTagihan = 100000;
        const sisaTagihan = 0;

        const formatRp = (angka) => {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
            }).format(angka);
        };

        const tanggalSekarang = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; color: #333;">
                <div style="background-color: #0E5E35; padding: 25px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Kwitansi Pembayaran SPP (PENGUJIAN SISTEM)</h2>
                    <p style="color: #c8e6c9; margin: 5px 0 0 0; font-size: 14px;">Pondok Pesantren Inayatullah</p>
                </div>
                
                <div style="padding: 30px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">Assalamu'alaikum, <strong>${namaSantri}</strong>,</p>
                    <p style="font-size: 14px; margin-bottom: 25px;">Ini adalah email pengujian untuk memverifikasi sistem notifikasi kwitansi pembayaran digital Anda. Rincian transaksi tiruan:</p>
                    
                    <div style="background-color: #f9fafb; border-left: 4px solid #0E5E35; padding: 15px; margin-bottom: 25px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; width: 40%;">NIS</td>
                                <td style="padding: 8px 0; font-weight: bold;">: ${nis}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666;">Kelas</td>
                                <td style="padding: 8px 0; font-weight: bold;">: ${kelas}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666;">Periode Tagihan</td>
                                <td style="padding: 8px 0; font-weight: bold;">: ${bulan} ${tahun}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666;">Total Tagihan</td>
                                <td style="padding: 8px 0; font-weight: bold;">: ${formatRp(totalTagihan)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666;">Tanggal Transaksi</td>
                                <td style="padding: 8px 0; font-weight: bold;">: ${tanggalSekarang}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <span style="display: block; font-size: 14px; color: #065f46; margin-bottom: 5px;">Nominal yang Disetorkan</span>
                        <span style="display: block; font-size: 28px; font-weight: bold; color: #059669;">${formatRp(nominalBayar)}</span>
                    </div>

                    <table style="width: 100%; font-size: 14px; background-color: #f0fdf4; padding: 15px; border-radius: 6px;">
                        <tr>
                            <td style="color: #166534;"><strong>Status Sisa Tagihan</strong></td>
                            <td style="text-align: right; font-weight: bold; color: #16a34a;">LUNAS</td>
                        </tr>
                    </table>

                    <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 13px; color: #666; text-align: center;">
                        <p style="margin: 0;">Email ini dihasilkan secara otomatis oleh Sistem Pembayaran PP Inayatullah.</p>
                        <p style="margin: 5px 0 0 0;">Pengujian sistem sukses berjalan tanpa kesalahan.</p>
                    </div>
                </div>
            </div>
        `;

        // 4. Send Email
        console.log('[4/4] Mengirim email melalui SMTP Google...');
        const info = await transporter.sendMail({
            from: `"PP Inayatullah" <${userGmail}>`,
            to: userGmail, // Kirim ke diri sendiri untuk memverifikasi penerimaan
            subject: `[PENGUJIAN] Kwitansi Pembayaran SPP - ${namaSantri} (${bulan} ${tahun})`,
            html: htmlContent,
        });

        console.log('\n======================================================');
        console.log('\x1b[32m✔ SUKSES! Email Kwitansi Berhasil Dikirim!\x1b[0m');
        console.log(`  Message ID: ${info.messageId}`);
        console.log(`  Tujuan    : ${userGmail}`);
        console.log('  Silakan cek inbox Gmail Anda dalam beberapa saat.');
        console.log('======================================================\n');

    } catch (err) {
        console.error('\n\x1b[31m❌ GAGAL mengirim email kwitansi:\x1b[0m', err.message);
        console.log('======================================================\n');
    }
}

sendTestReceipt();

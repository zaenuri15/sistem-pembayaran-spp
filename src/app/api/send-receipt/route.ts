import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            emailTujuan,
            namaSantri,
            nis,
            kelas,
            bulan,
            tahun,
            nominalBayar,
            totalTagihan,
            sisaTagihan
        } = body;

        // Validasi input
        if (!emailTujuan) {
            return NextResponse.json(
                { success: false, error: 'Email tujuan tidak ditemukan / kosong' },
                { status: 400 }
            );
        }

        // Cek credential .env
        const userGmail = process.env.GMAIL_USER;
        const passGmail = process.env.GMAIL_APP_PASSWORD;

        if (!userGmail || !passGmail) {
            return NextResponse.json(
                { success: false, error: 'Kredensial Gmail belum dikonfigurasi di server (.env.local)' },
                { status: 500 }
            );
        }

        // Konfigurasi transporter Nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: userGmail,
                pass: passGmail,
            },
        });

        // Format Rupiah (Server side)
        const formatRp = (angka: number) => {
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

        // HTML Template Kwitansi
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; color: #333;">
                <div style="background-color: #0E5E35; padding: 25px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Kwitansi Pembayaran SPP</h2>
                    <p style="color: #c8e6c9; margin: 5px 0 0 0; font-size: 14px;">Pondok Pesantren Inayatullah</p>
                </div>
                
                <div style="padding: 30px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">Assalamu'alaikum, <strong>${namaSantri}</strong>,</p>
                    <p style="font-size: 14px; margin-bottom: 25px;">Terima kasih, pembayaran SPP dan tagihan Anda telah berhasil dicatat oleh bendahara. Berikut adalah rincian pembayaran Anda:</p>
                    
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

                    <table style="width: 100%; font-size: 14px; background-color: ${sisaTagihan > 0 ? '#fef2f2' : '#f0fdf4'}; padding: 15px; border-radius: 6px;">
                        <tr>
                            <td style="color: ${sisaTagihan > 0 ? '#991b1b' : '#166534'};"><strong>Status Sisa Tagihan</strong></td>
                            <td style="text-align: right; font-weight: bold; color: ${sisaTagihan > 0 ? '#dc2626' : '#16a34a'};">
                                ${sisaTagihan > 0 ? formatRp(sisaTagihan) : 'LUNAS'}
                            </td>
                        </tr>
                    </table>

                    <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 13px; color: #666; text-align: center;">
                        <p style="margin: 0;">Email ini dihasilkan secara otomatis oleh Sistem Pembayaran PP Inayatullah.</p>
                        <p style="margin: 5px 0 0 0;">Mohon simpan email ini sebagai tanda bukti pembayaran yang sah.</p>
                    </div>
                </div>
            </div>
        `;

        // Proses pengiriman
        await transporter.sendMail({
            from: `"PP Inayatullah" <${userGmail}>`,
            to: emailTujuan,
            subject: `Kwitansi Pembayaran SPP - ${namaSantri} (${bulan} ${tahun})`,
            html: htmlContent,
        });

        return NextResponse.json({ success: true, message: 'Email berhasil dikirim' }, { status: 200 });
    } catch (error: any) {
        console.error('Error saat mengirim email:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Terjadi kesalahan sistem' },
            { status: 500 }
        );
    }
}

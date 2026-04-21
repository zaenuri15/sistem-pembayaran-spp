"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./wali.module.css";

interface PaymentRecord {
    id: string;
    bulan: number;
    tahun: number;
    totalTagihan: number;
    dibayarkan: number;
    tagihan_batch?: any;
}

interface SantriProfile {
    id: string;
    nis: string;
    nama: string;
    kelas: string;
    nama_wali: string;
}

export default function WaliPage() {
    const router = useRouter();
    const [santri, setSantri] = useState<SantriProfile | null>(null);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTahun, setFilterTahun] = useState<string>("all");
    const printRef = useRef<HTMLDivElement>(null);
    const [selectedKwitansi, setSelectedKwitansi] = useState<PaymentRecord | null>(null);

    useEffect(() => {
        const handleAfterPrint = () => {
            setSelectedKwitansi(null);
        };
        window.addEventListener("afterprint", handleAfterPrint);
        return () => window.removeEventListener("afterprint", handleAfterPrint);
    }, []);

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            const santriId = localStorage.getItem('user_wali_santri_id');
            if (!santriId) {
                router.push('/login');
                return;
            }

            try {
                // Fetch santri profile and payment data from API
                const response = await fetch(`/api/pembayaran/santri/${santriId}`);
                const result = await response.json();

                if (!result.success) {
                    console.error("Error fetching data", result.error);
                    router.push('/login');
                    return;
                }

                const { santri: santriData, payments: paymentData } = result.data;
                setSantri(santriData);

                // Map payment data to match expected format
                const mappedPayments: PaymentRecord[] = paymentData.map((item: any) => ({
                    id: item.id,
                    bulan: item.tagihan_batch.bulan,
                    tahun: item.tagihan_batch.tahun,
                    totalTagihan: item.tagihan_batch.total,
                    dibayarkan: item.dibayarkan,
                    tagihan_batch: item.tagihan_batch
                }));

                // Set default filter to current year if exists, else 'all'
                const currentYear = new Date().getFullYear();
                const hasCurrentYear = mappedPayments.some(p => p.tahun === currentYear);
                setFilterTahun(hasCurrentYear ? String(currentYear) : "all");

                setPayments(mappedPayments);
            } catch (err) {
                console.error(err);
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };

        checkAuthAndFetch();
    }, [router]);

    const handleLogout = () => {
        if (confirm("Apakah Anda yakin ingin keluar?")) {
            localStorage.removeItem('user_wali_santri_id');
            router.push("/login");
        }
    };

    const handleExportPDF = () => {
        window.print();
    };

    if (loading) return <div className={styles.loading}>Loading...</div>;
    if (!santri) return null;

    const availableYears = [...new Set(payments.map((p) => p.tahun))].sort((a, b) => b - a);

    const filteredData = payments
        .filter((p) => filterTahun === "all" || p.tahun === Number(filterTahun))
        .sort((a, b) => {
            if (a.tahun !== b.tahun) return b.tahun - a.tahun;
            return b.bulan - a.bulan;
        });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getMonthName = (month: number) => {
        return new Date(0, month - 1).toLocaleString("id-ID", { month: "long" });
    };

    const terbilang = (angka: number): string => {
        if (angka === 0) return "Nol";
        const huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
        let hasil = "";
        if (angka < 12) hasil = huruf[angka];
        else if (angka < 20) hasil = terbilang(angka - 10) + " Belas";
        else if (angka < 100) hasil = terbilang(Math.floor(angka / 10)) + " Puluh " + terbilang(angka % 10);
        else if (angka < 200) hasil = "Seratus " + terbilang(angka - 100);
        else if (angka < 1000) hasil = terbilang(Math.floor(angka / 100)) + " Ratus " + terbilang(angka % 100);
        else if (angka < 2000) hasil = "Seribu " + terbilang(angka - 1000);
        else if (angka < 1000000) hasil = terbilang(Math.floor(angka / 1000)) + " Ribu " + terbilang(angka % 1000);
        else if (angka < 1000000000) hasil = terbilang(Math.floor(angka / 1000000)) + " Juta " + terbilang(angka % 1000000);
        return hasil.trim();
    };

    const handleCetakKwitansi = (rec: PaymentRecord) => {
        setSelectedKwitansi(rec);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    const getStatus = (rec: PaymentRecord) => {
        if (rec.dibayarkan >= rec.totalTagihan) return "Lunas";
        if (rec.dibayarkan > 0) return "Cicilan";
        return "Belum Lunas";
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "Lunas": return styles.badgeLunas;
            case "Cicilan": return styles.badgeCicilan;
            default: return styles.badgeBelumLunas;
        }
    };

// Summary calculations
const totalTagihan = filteredData.reduce((sum, p) => sum + p.totalTagihan, 0);
const totalDibayar = filteredData.reduce((sum, p) => sum + p.dibayarkan, 0);
const totalSisa = totalTagihan - totalDibayar;

return (
    <div className={styles.layoutContainer}>
        <div className={`${selectedKwitansi ? styles.hideForKwitansi : ""} ${styles.screenOnly}`}>
            {/* Navbar */}
            <nav className={styles.navbar}>
                <div className={styles.navBrand}>
                    <Image
                        src="/images/logo.png"
                        alt="Logo"
                        width={40}
                        height={40}
                    />
                    <div>
                        <div className={styles.navTitle}>PP Inayatullah</div>
                        <div className={styles.navSubtitle}>Portal Wali Santri</div>
                    </div>
                </div>
                <div className={styles.navUser}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span>{santri.nama_wali}</span>
                    <button
                        onClick={handleLogout}
                        title="Logout"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            backgroundColor: 'transparent',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            color: '#EF4444',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                            marginLeft: '8px',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Logout
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className={styles.mainContent} ref={printRef}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.greeting}>Assalamu&apos;alaikum, {santri.nama_wali} 👋</h1>
                        <p className={styles.subtitle}>Laporan pembayaran untuk: <strong>{santri.nama}</strong> &bull; NIS: {santri.nis} &bull; Kelas: {santri.kelas}</p>
                    </div>
                    <button className={styles.btnExport} onClick={handleExportPDF}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export PDF
                    </button>
                </div>

                {/* Summary Cards */}
                <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>Total Tagihan</div>
                        <div className={styles.summaryValue}>{formatCurrency(totalTagihan)}</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>Sudah Dibayar</div>
                        <div className={`${styles.summaryValue} ${styles.summaryValueGreen}`}>{formatCurrency(totalDibayar)}</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>Sisa Tagihan</div>
                        <div className={`${styles.summaryValue} ${totalSisa > 0 ? styles.summaryValueRed : styles.summaryValueGreen}`}>{formatCurrency(totalSisa)}</div>
                    </div>
                </div>

                {/* Table */}
                <div className={styles.tableCard}>
                    <div className={styles.tableTitle}>
                        Riwayat Pembayaran
                        <select
                            value={filterTahun}
                            onChange={(e) => setFilterTahun(e.target.value)}
                            className={styles.yearFilter}
                        >
                            <option value="all">Semua Tahun</option>
                            {availableYears.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Bulan</th>
                                <th>Total Tagihan</th>
                                <th>Dibayarkan</th>
                                <th>Sisa</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((rec, index) => {
                                const status = getStatus(rec);
                                const sisa = rec.totalTagihan - rec.dibayarkan;
                                return (
                                    <tr key={rec.id}>
                                        <td>{index + 1}</td>
                                        <td>{getMonthName(rec.bulan)} {rec.tahun}</td>
                                        <td>{formatCurrency(rec.totalTagihan)}</td>
                                        <td>
                                            <span className={styles.amountPaid}>
                                                {formatCurrency(rec.dibayarkan)}
                                            </span>
                                        </td>
                                        <td>
                                            {sisa > 0 ? formatCurrency(sisa) : "-"}
                                        </td>
                                        <td>
                                            <span className={`${styles.badge} ${getStatusStyle(status)}`}>
                                                {status}
                                            </span>
                                        </td>
                                        <td>
                                            {rec.dibayarkan > 0 && (
                                                <button
                                                    className={styles.btnActionCetak}
                                                    onClick={() => handleCetakKwitansi(rec)}
                                                >
                                                    Cetak Kwitansi
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    &copy; {new Date().getFullYear()} Pondok Pesantren Inayatullah. Semua hak dilindungi.
                </div>
            </main>
        </div>

        {/* Formal Report for Print */}
        {!selectedKwitansi && (
            <div className={styles.printOnlyReport}>
                <div className={styles.kTopHeader} style={{ marginBottom: '30px' }}>
                    <div className={styles.kLogoAndText}>
                        <Image src="/images/logo.png" width={70} height={70} alt="Logo" style={{ borderRadius: '50%' }} />
                        <div className={styles.kSchoolInfo}>
                            <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Yayasan Pondok Pesantren</div>
                            <div className={styles.kSchoolName} style={{ fontSize: '22px' }}>PONDOK PESANTREN INAYATULLAH</div>
                            <div style={{ fontSize: '12px' }}>Jl. Monjali 20, Nandan Sariharjo Ngaglik Sleman Yogyakarta 55581 | Telp: 0812-XXXX-XXXX</div>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', textTransform: 'uppercase', textDecoration: 'underline' }}>Laporan Rekapitulasi Pembayaran SPP</h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>Tahun Ajaran: {filterTahun === 'all' ? 'Semua Tahun' : filterTahun}</p>
                </div>

                <div style={{ marginBottom: '25px', fontSize: '14px', lineHeight: '1.8' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ width: '150px' }}><strong>Nama Santri</strong></td>
                                <td>: {santri.nama}</td>
                                <td style={{ width: '150px' }}><strong>Tanggal Cetak</strong></td>
                                <td>: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                            </tr>
                            <tr>
                                <td><strong>Nomor Induk (NIS)</strong></td>
                                <td>: {santri.nis}</td>
                                <td><strong>Nama Wali</strong></td>
                                <td>: {santri.nama_wali}</td>
                            </tr>
                            <tr>
                                <td><strong>Kelas</strong></td>
                                <td>: {santri.kelas}</td>
                                <td><strong>Status Laporan</strong></td>
                                <td>: {totalSisa <= 0 ? 'LUNAS (Selesai)' : 'BELUM LUNAS'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <table className={styles.kTable}>
                    <thead>
                        <tr>
                            <th style={{ width: '5%', textAlign: 'center', border: '1px solid #000' }}>No</th>
                            <th style={{ textAlign: 'left', border: '1px solid #000' }}>Ringkasan Tagihan (Bulan)</th>
                            <th style={{ textAlign: 'right', border: '1px solid #000' }}>Total Tagihan</th>
                            <th style={{ textAlign: 'right', border: '1px solid #000' }}>Telah Dibayar</th>
                            <th style={{ textAlign: 'right', border: '1px solid #000' }}>Kekurangan / Sisa</th>
                            <th style={{ textAlign: 'center', border: '1px solid #000' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? (
                            filteredData.map((rec, index) => {
                                const status = getStatus(rec);
                                const sisa = rec.totalTagihan - rec.dibayarkan;
                                return (
                                    <tr key={index}>
                                        <td align="center" style={{ border: '1px solid #000' }}>{index + 1}</td>
                                        <td style={{ border: '1px solid #000' }}>SPP {getMonthName(rec.bulan)} {rec.tahun}</td>
                                        <td align="right" style={{ border: '1px solid #000' }}>{formatCurrency(rec.totalTagihan)}</td>
                                        <td align="right" style={{ border: '1px solid #000' }}>{formatCurrency(rec.dibayarkan)}</td>
                                        <td align="right" style={{ border: '1px solid #000' }}>{sisa > 0 ? formatCurrency(sisa) : "-"}</td>
                                        <td align="center" style={{ border: '1px solid #000', fontWeight: 'bold' }}>{status}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} align="center" style={{ padding: '20px', border: '1px solid #000', fontStyle: 'italic' }}>Belum ada riwayat pembayaran.</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, paddingRight: '20px', border: '1px solid #000' }}>TOTAL AKUMULASI</td>
                            <td align="right" style={{ fontWeight: 700, border: '1px solid #000' }}>{formatCurrency(totalTagihan)}</td>
                            <td align="right" style={{ fontWeight: 700, border: '1px solid #000' }}>{formatCurrency(totalDibayar)}</td>
                            <td align="right" style={{ fontWeight: 700, border: '1px solid #000' }}>{formatCurrency(totalSisa)}</td>
                            <td style={{ border: '1px solid #000' }}></td>
                        </tr>
                    </tfoot>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '50px' }}>
                    <div style={{ textAlign: 'center', width: '280px' }}>
                        <p style={{ margin: '0 0 70px 0', fontSize: '14px' }}>
                            Sleman, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
                            Mengetahui,<br/>
                            Bagian Administrasi & Keuangan
                        </p>
                        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', fontSize: '15px' }}>ADMINISTRATOR SISTEM</p>
                        <p style={{ margin: 0, fontSize: '13px' }}>PP Inayatullah</p>
                    </div>
                </div>
            </div>
        )}

        {selectedKwitansi && (
            <div className={styles.kwitansiContainer}>
                <div className={styles.kwitansiWrapper}>
                    <div className={styles.kTopHeader}>
                        <div className={styles.kLogoAndText}>
                            <Image src="/images/logo.png" width={60} height={60} alt="Logo" style={{ borderRadius: '50%' }} />
                            <div className={styles.kSchoolInfo}>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase' }}>Yayasan Pondok Pesantren</div>
                                <div className={styles.kSchoolName}>PONDOK PESANTREN INAYATULLAH</div>
                                <div style={{ fontSize: '10px' }}>Jl. Monjali 20, Nandan Sariharjo Ngaglik Sleman Yogyakarta 55581 | Telp: 0812-XXXX-XXXX</div>
                            </div>
                        </div>
                        <div className={styles.kTitle}>KWITANSI</div>
                    </div>

                    <div className={styles.kDetailsGrid}>
                        <div className={styles.kGroup}>
                            <div><span className={styles.kLabel}>No Transaksi</span><span>: {String(selectedKwitansi.id).substring(0, 8).toUpperCase()}</span></div>
                            <div><span className={styles.kLabel}>Tanggal</span><span>: {new Date().toLocaleDateString('id-ID')}</span></div>
                            <div><span className={styles.kLabel}>Jam Cetak</span><span>: {new Date().toLocaleTimeString('id-ID')}</span></div>
                        </div>
                        <div className={styles.kGroup}>
                            <div><span className={styles.kLabel}>No Induk</span><span>: {santri.nis}</span></div>
                            <div><span className={styles.kLabel}>Nama Siswa</span><span>: {santri.nama}</span></div>
                            <div><span className={styles.kLabel}>Kelas</span><span>: {santri.kelas}</span></div>
                        </div>
                    </div>

                    <table className={styles.kTable}>
                        <thead>
                            <tr>
                                <th style={{ width: '10%', textAlign: 'center' }}>No</th>
                                <th style={{ textAlign: 'left' }}>Jenis Pembayaran</th>
                                <th style={{ textAlign: 'right' }}>Jumlah</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td align="center">1</td>
                                <td>SPP Bulan {getMonthName(selectedKwitansi.bulan)} {selectedKwitansi.tahun}</td>
                                <td align="right">{formatCurrency(selectedKwitansi.tagihan_batch?.spp || 0)}</td>
                            </tr>
                            <tr>
                                <td align="center">2</td>
                                <td>Infaq / Kebersihan</td>
                                <td align="right">{formatCurrency(selectedKwitansi.tagihan_batch?.kebersihan || 0)}</td>
                            </tr>
                            <tr>
                                <td align="center">3</td>
                                <td>Uang Konsumsi</td>
                                <td align="right">{formatCurrency(selectedKwitansi.tagihan_batch?.konsumsi || 0)}</td>
                            </tr>
                            <tr>
                                <td align="center">4</td>
                                <td>Uang Pembangunan</td>
                                <td align="right">{formatCurrency(selectedKwitansi.tagihan_batch?.pembangunan || 0)}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, paddingRight: '20px' }}>TOTAL TAGIHAN</td>
                                <td align="right" style={{ fontWeight: 700 }}>{formatCurrency(selectedKwitansi.totalTagihan)}</td>
                            </tr>
                            <tr>
                                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, paddingRight: '20px', color: '#000' }}>TOTAL DIBAYAR</td>
                                <td align="right" style={{ fontWeight: 700, color: '#000' }}>{formatCurrency(selectedKwitansi.dibayarkan)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className={styles.kBottomGrid}>
                        <div className={styles.kTerbilangBox}>
                            <div style={{ fontStyle: 'italic', marginBottom: '8px' }}>Terbilang :</div>
                            <div className={styles.kTerbilangText}>{terbilang(selectedKwitansi.dibayarkan)} Rupiah</div>
                        </div>
                        <div className={styles.kSignatureBox}>
                            <div style={{ marginBottom: '40px' }}>Sleman, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Penerima</div>
                            <div style={{ fontWeight: 700, textDecoration: 'underline' }}>ADMIN KEUANGAN</div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
);
}

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
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("tagihan");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(openAccordion === id ? null : id);
    };

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
            if (!santriId || santriId === 'undefined' || santriId === 'null') {
                localStorage.removeItem('user_wali_santri_id');
                router.push('/login');
                return;
            }

            try {
                // Fetch santri profile and payment data from API
                const response = await fetch(`/api/pembayaran/santri/${santriId}`);
                const result = await response.json();

                if (!result.success) {
                    // Santri not found — clear stale data and redirect to login
                    localStorage.removeItem('user_wali_santri_id');
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
                localStorage.removeItem('user_wali_santri_id');
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
            {/* Mobile Overlay */}
            {isMobileMenuOpen && !selectedKwitansi && (
                <div 
                    className={styles.mobileOverlay} 
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${selectedKwitansi ? styles.hideForKwitansi : ''} ${isMobileMenuOpen ? styles.sidebarOpen : ''}`}>
                    <div className={styles.logoSection}>
                        <Image
                            src="/images/logo.png"
                            alt="Logo Pondok"
                            width={48}
                            height={48}
                            style={{ objectFit: 'cover' }}
                        />
                        <div className={styles.logoText}>
                            <div className={styles.logoName}>PP Inayatullah</div>
                            <div className={styles.logoSubtitle}>Portal Wali Santri</div>
                        </div>
                    </div>

                    <nav className={styles.menuContainer}>
                        <div className={styles.menuSection}>
                            <div
                                className={`${styles.menuItem} ${activeTab === 'tagihan' ? styles.menuItemActive : ''}`}
                                onClick={() => setActiveTab('tagihan')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                </svg>
                                <span>Dashboard & Tagihan</span>
                            </div>
                        </div>

                        <div className={styles.menuSection}>
                            <div
                                className={`${styles.menuItem} ${activeTab === 'akademik' ? styles.menuItemActive : ''}`}
                                onClick={() => setActiveTab('akademik')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                                </svg>
                                <span>Informasi Akademik</span>
                            </div>
                        </div>

                        <div className={styles.menuSection}>
                            <div
                                className={`${styles.menuItem} ${activeTab === 'bantuan' ? styles.menuItemActive : ''}`}
                                onClick={() => setActiveTab('bantuan')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                <span>FAQ & Bantuan</span>
                            </div>
                        </div>
                    </nav>
                </aside>

                {/* Content Area */}
            <div className={`${styles.contentArea} ${selectedKwitansi ? styles.hideForKwitansi : ''}`}>
                <header className={styles.topbar}>
                    <div className={styles.topbarLeft}>
                        <button 
                            className={styles.hamburgerBtn}
                            onClick={() => setIsMobileMenuOpen(true)}
                            aria-label="Open Menu"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    <div className={styles.userActions}>
                            <div className={styles.userProfile}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <span>{santri.nama_wali}</span>
                            </div>
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
                    </header>

                    <main className={styles.mainContent} ref={printRef}>
                        {/* Page Header */}
                        <div className={styles.pageHeader}>
                            <div>
                                <h1 className={styles.greeting}>Assalamu&apos;alaikum, {santri.nama_wali} 👋</h1>
                                <p className={styles.subtitle}>Laporan pembayaran untuk: <strong>{santri.nama}</strong> &bull; NIS: {santri.nis} &bull; Kelas: {santri.kelas}</p>
                            </div>
                            <button className={styles.btnExport} onClick={handleExportPDF}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Export PDF
                            </button>
                        </div>

                        {activeTab === 'tagihan' && (
                            <>
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
                                                <th style={{ textAlign: "center" }} className="screenOnly">Aksi</th>
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
                                                        <td style={{ textAlign: "center" }} className="screenOnly">
                                                            {rec.dibayarkan > 0 && (
                                                                <button
                                                                    className={styles.btnActionCetak}
                                                                    onClick={() => handleCetakKwitansi(rec)}
                                                                    title="Cetak Kwitansi"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                                                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                                                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                                                        <rect x="6" y="14" width="12" height="8"></rect>
                                                                    </svg>
                                                                    Kwitansi
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {activeTab === 'akademik' && (
                            <div className={styles.infoSection}>
                                <div className={styles.infoMainTitle}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D9A4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                                    </svg>
                                    Informasi Akademik & Kegiatan Santri
                                </div>

                                {/* Accordion 1: Jadwal Kegiatan */}
                                <div className={styles.accordionItem}>
                                    <button className={styles.accordionHeader} onClick={() => toggleAccordion('jadwal')}>
                                        <div className={styles.accordionHeaderLeft}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9A4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                            1. Jadwal Harian & Mingguan
                                        </div>
                                        <div className={`${styles.accordionIcon} ${openAccordion === 'jadwal' ? styles.open : ''}`}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </div>
                                    </button>
                                    <div className={`${styles.accordionContent} ${openAccordion === 'jadwal' ? styles.open : ''}`}>
                                        <div className={styles.accordionInner}>
                                            <div className={styles.infoGrid}>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}>🌅 Pagi (04.00 – 07.00)</div>
                                                    <ul className={styles.infoList}>
                                                        <li><strong>04.00:</strong> Bangun tidur</li>
                                                        <li><strong>04.15 – 04.45:</strong> Tahajud (opsional, dianjurkan)</li>
                                                        <li><strong>05.00 – 05.30:</strong> Shalat Subuh berjamaah</li>
                                                        <li><strong>05.30 – 06.15:</strong>
                                                            <ul className={styles.infoSubList}>
                                                                <li>Senin–Rabu: Tilawah / Tahsin</li>
                                                                <li>Kamis–Jumat: Hafalan (Al-Qur’an / matan)</li>
                                                                <li>Sabtu–Ahad: Kajian ringan / kultum</li>
                                                            </ul>
                                                        </li>
                                                        <li><strong>06.15 – 07.00:</strong> Persiapan kuliah</li>
                                                    </ul>
                                                </div>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}>☀️ Siang (Free – Kampus)</div>
                                                    <div className={styles.infoHighlight}>Fokus kuliah & aktivitas luar. Tidak ada kegiatan wajib pondok.</div>
                                                </div>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}>🌙 Malam (18.00 – 22.00)</div>
                                                    <ul className={styles.infoList}>
                                                        <li><strong>18.00 – 18.30:</strong> Shalat Maghrib berjamaah</li>
                                                        <li><strong>18.30 – 19.30:</strong> Kajian inti (bergilir)*</li>
                                                        <li><strong>19.30 – 20.00:</strong> Shalat Isya berjamaah</li>
                                                        <li><strong>20.00 – 21.30:</strong> KBM (Belajar Malam)</li>
                                                        <li><strong>21.30 – 22.00:</strong> Absensi + info pondok</li>
                                                        <li><strong>22.00:</strong> Istirahat</li>
                                                    </ul>
                                                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>*Selama kajian, santri tidak diperkenankan bermain HP.</div>
                                                </div>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}>🔁 Program Mingguan</div>
                                                    <ul className={styles.infoList}>
                                                        <li>1x Muhadharah (wajib tampil bergilir)</li>
                                                        <li>1x Kerja bakti (ro’an)</li>
                                                        <li>1x Kajian tematik (isu mahasiswa/manajemen)</li>
                                                        <li>1x Olahraga bersama (opsional)</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Accordion 2: Kurikulum & Kelas */}
                                <div className={styles.accordionItem}>
                                    <button className={styles.accordionHeader} onClick={() => toggleAccordion('kurikulum')}>
                                        <div className={styles.accordionHeaderLeft}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9A4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                            2. Kurikulum Kajian & Klasifikasi Kelas
                                        </div>
                                        <div className={`${styles.accordionIcon} ${openAccordion === 'kurikulum' ? styles.open : ''}`}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </div>
                                    </button>
                                    <div className={`${styles.accordionContent} ${openAccordion === 'kurikulum' ? styles.open : ''}`}>
                                        <div className={styles.accordionInner}>
                                            <div className={styles.infoTitle}>📚 Kurikulum Kajian (Contoh Rujukan)</div>
                                            <ul className={styles.infoList} style={{ columnCount: 2, columnGap: '20px' }}>
                                                <li><strong>Fiqih:</strong> Safinatun Najah / Fathul Qorib</li>
                                                <li><strong>Aqidah:</strong> Aqidatul Awam</li>
                                                <li><strong>Hadits:</strong> Arbain Nawawi</li>
                                                <li><strong>Tafsir:</strong> Tafsir Juz Amma</li>
                                                <li><strong>Tahsin:</strong> Perbaikan makhraj & tajwid</li>
                                            </ul>

                                            <div className={styles.infoTitle} style={{ marginTop: '24px' }}>🏫 Struktur Kelas Pondok Mahasiswa</div>
                                            <div className={styles.infoGrid}>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}><span className={styles.badgeSm} style={{ background: '#D1FAE5', color: '#065F46' }}>1</span> Kelas Ibtida’ (Dasar)</div>
                                                    <p style={{ margin: '0 0 8px 0' }}><strong>Target:</strong> Pemula. Pengalaman baca huruf Arab & dasar Al-Qur'an.</p>
                                                    <p style={{ margin: 0 }}><strong>Kitab:</strong> Amtsilah Tashrifiyah, Matan dasar Nahwu.</p>
                                                </div>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}><span className={styles.badgeSm} style={{ background: '#FEF08A', color: '#854D0E' }}>2</span> Kelas Jurumiyah</div>
                                                    <p style={{ margin: '0 0 8px 0' }}><strong>Target:</strong> Sudah paham dasar. I’rab dasar, Fi’il-Fa’il.</p>
                                                    <p style={{ margin: 0 }}><strong>Kitab:</strong> Al-Ajurrumiyyah.</p>
                                                </div>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}><span className={styles.badgeSm} style={{ background: '#FED7AA', color: '#9A3412' }}>3</span> Kelas Imrithi</div>
                                                    <p style={{ margin: '0 0 8px 0' }}><strong>Target:</strong> Lanjutan Jurumiyah. Praktik i'rab & hafalan.</p>
                                                    <p style={{ margin: 0 }}><strong>Kitab:</strong> Nadzom Imrithi.</p>
                                                </div>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}><span className={styles.badgeSm} style={{ background: '#BFDBFE', color: '#1E3A8A' }}>4</span> Kelas Alfiyah 1 & 2</div>
                                                    <p style={{ margin: '0 0 8px 0' }}><strong>Target:</strong> Menengah hingga Mahir. Analisis nahwu kompleks.</p>
                                                    <p style={{ margin: 0 }}><strong>Kitab:</strong> Alfiyah Ibnu Malik.</p>
                                                </div>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}><span className={styles.badgeSm} style={{ background: '#FECDD3', color: '#9F1239' }}>6</span> Kelas Musyawirin</div>
                                                    <p style={{ margin: '0 0 8px 0' }}><strong>Target:</strong> Senior. Siap jadi pembimbing / pengajar.</p>
                                                    <p style={{ margin: 0 }}><strong>Fokus:</strong> Musyawarah, Bahtsul Masail, bedah kitab.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Accordion 3: Aturan & Tata Tertib */}
                                <div className={styles.accordionItem}>
                                    <button className={styles.accordionHeader} onClick={() => toggleAccordion('aturan')}>
                                        <div className={styles.accordionHeaderLeft}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9A4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                            3. Tata Tertib, Absensi & Kepengurusan
                                        </div>
                                        <div className={`${styles.accordionIcon} ${openAccordion === 'aturan' ? styles.open : ''}`}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </div>
                                    </button>
                                    <div className={`${styles.accordionContent} ${openAccordion === 'aturan' ? styles.open : ''}`}>
                                        <div className={styles.accordionInner}>
                                            <div className={styles.infoGrid}>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}>⚖️ Aturan Dasar Pondok</div>
                                                    <ol className={styles.infoList} style={{ listStyleType: 'decimal' }}>
                                                        <li>Wajib ikut jamaah (minimal Subuh & Maghrib-Isya)</li>
                                                        <li>Wajib ikut kajian malam (kecuali izin)</li>
                                                        <li>Menjaga adab & kebersihan asrama</li>
                                                        <li>Tidak pulang malam tanpa izin pengurus</li>
                                                        <li>Saling menghormati sesama santri</li>
                                                    </ol>
                                                </div>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}>📋 Sistem Absensi</div>
                                                    <ul className={styles.infoList}>
                                                        <li><strong>Wajib:</strong> Subuh & Maghrib-Isya</li>
                                                        <li><strong>Ketentuan Izin:</strong>
                                                            <ul className={styles.infoSubList}>
                                                                <li>Kuliah malam</li>
                                                                <li>Sakit</li>
                                                                <li>Kepentingan sangat mendesak</li>
                                                            </ul>
                                                        </li>
                                                    </ul>
                                                </div>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}>🎯 Target Pembinaan</div>
                                                    <ul className={styles.infoList}>
                                                        <li>Disiplin ibadah & manajemen waktu</li>
                                                        <li>Memiliki landasan ilmu agama yang kuat</li>
                                                        <li>Mampu public speaking (dakwah/muhadharah)</li>
                                                        <li>Mencapai keseimbangan Kuliah & Ngaji</li>
                                                    </ul>
                                                </div>
                                                <div className={styles.infoCard}>
                                                    <div className={styles.infoCardTitle}>👥 Sistem Kepengurusan</div>
                                                    <ul className={styles.infoList}>
                                                        <li>Ketua, Sekretaris, Bendahara</li>
                                                        <li>Sie Ibadah (Imam, Muadzin)</li>
                                                        <li>Sie Pendidikan (Kurikulum, Mentor)</li>
                                                        <li>Sie Kebersihan & Keamanan</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'bantuan' && (
                            <>
                                {/* FAQ & Pusat Bantuan */}
                                <div className={styles.faqCard} id="bantuan">
                                    <h3 className={styles.faqTitle}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                        </svg>
                                        FAQ & Pusat Bantuan
                                    </h3>

                                    <div className={styles.faqList}>
                                        <div className={styles.faqItem}>
                                            <div className={styles.faqQuestion}>Q: Bagaimana jika saya ada kendala dalam pembayaran?</div>
                                            <div className={styles.faqAnswer}>
                                                A: Jika Anda mengalami kendala pembayaran, keterlambatan, atau masalah sistem, silakan konsultasikan langsung dengan pengelola (Bendahara) melalui WhatsApp.
                                            </div>
                                        </div>
                                        <div className={styles.faqItem}>
                                            <div className={styles.faqQuestion}>Q: Apakah saya bisa mengajukan dispensasi penundaan pembayaran?</div>
                                            <div className={styles.faqAnswer}>
                                                A: Bisa. Pengajuan dispensasi penundaan atau cicilan pembayaran dapat dikomunikasikan secara langsung ke Bendahara pondok dengan menjelaskan alasan yang jelas.
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.faqChatBox}>
                                        <p className={styles.faqChatText}>Hubungi Pengelola untuk Konsultasi Pembayaran / Dispensasi:</p>
                                        <div className={styles.faqChatButtons}>
                                            <a href="https://wa.me/6281225181112?text=Assalamu'alaikum,%20saya%20ingin%20konsultasi%20terkait%20pembayaran%20SPP/Dispensasi." target="_blank" rel="noopener noreferrer" className={styles.faqChatBtn}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                                </svg>
                                                Chat Bendahara Putra
                                            </a>
                                            <a href="https://wa.me/6282221004147?text=Assalamu'alaikum,%20saya%20ingin%20konsultasi%20terkait%20pembayaran%20SPP/Dispensasi." target="_blank" rel="noopener noreferrer" className={`${styles.faqChatBtn} ${styles.faqChatBtnPutri}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                                </svg>
                                                Chat Bendahara Putri
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

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
                                Sleman, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
                                Mengetahui,<br />
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

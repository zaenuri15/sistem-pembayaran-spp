"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./user.module.css";

interface PaymentRecord {
    id: string;
    bulan: number;
    tahun: number;
    totalTagihan: number;
    dibayarkan: number;
}

interface SantriProfile {
    id: string;
    nis: string;
    nama: string;
    kelas: string;
    jenis_kelamin?: string;
    tanggal_lahir?: string;
    alamat?: string;
    email?: string;
    nama_wali?: string;
}

export default function UserPage() {
    const router = useRouter();
    const [santri, setSantri] = useState<SantriProfile | null>(null);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTahun, setFilterTahun] = useState<string>("all");
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("tagihan");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(openAccordion === id ? null : id);
    };

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            const santriId = localStorage.getItem('user_santri_id');
            if (!santriId || santriId === 'undefined' || santriId === 'null') {
                localStorage.removeItem('user_santri_id');
                router.push('/login');
                return;
            }

            try {
                // Fetch santri profile and payment data from API
                const response = await fetch(`/api/pembayaran/santri/${santriId}`);
                const result = await response.json();

                if (!result.success) {
                    localStorage.removeItem('user_santri_id');
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
                    dibayarkan: item.dibayarkan
                }));

                // Set default filter to current year if exists, else 'all'
                const currentYear = new Date().getFullYear();
                const hasCurrentYear = mappedPayments.some(p => p.tahun === currentYear);
                setFilterTahun(hasCurrentYear ? String(currentYear) : "all");

                setPayments(mappedPayments);
            } catch (err) {
                console.error(err);
                localStorage.removeItem('user_santri_id');
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };

        checkAuthAndFetch();
    }, [router]);

    const handleLogout = () => {
        if (confirm("Apakah Anda yakin ingin keluar?")) {
            localStorage.removeItem('user_santri_id');
            router.push("/login");
        }
    };

    if (loading) return <div className={styles.loading}>Loading...</div>;
    if (!santri) return null;

    const availableYears = [...new Set(payments.map((p) => p.tahun))].sort((a, b) => b - a);

    const filteredData = payments
        .filter((p) => filterTahun === "all" || p.tahun === Number(filterTahun))
        .sort((a, b) => {
            if (a.tahun !== b.tahun) return b.tahun - a.tahun;
            return b.bulan - a.bulan; // Sort descending month
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
            {isMobileMenuOpen && (
                <div
                    className={styles.mobileOverlay}
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''}`}>
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
                        <div className={styles.logoSubtitle}>Portal Santri</div>
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
                            className={`${styles.menuItem} ${activeTab === 'pembayaran' ? styles.menuItemActive : ''}`}
                            onClick={() => setActiveTab('pembayaran')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                            <span>Info Pembayaran</span>
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

                    <div className={styles.menuSection}>
                        <div
                            className={`${styles.menuItem} ${activeTab === 'profil' ? styles.menuItemActive : ''}`}
                            onClick={() => setActiveTab('profil')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span>Profil Saya</span>
                        </div>
                    </div>
                </nav>
            </aside>

            {/* Content Area */}
            <div className={styles.contentArea}>
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
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span>{santri.nama}</span>
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

                <main className={styles.mainContent}>
                    {/* Header */}
                    <div className={styles.pageHeader}>
                        <h1 className={styles.greeting}>Assalamu&apos;alaikum, {santri.nama} 👋</h1>
                        <p className={styles.subtitle}>NIS: {santri.nis} &bull; Kelas: {santri.kelas}</p>
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
                            <div className={styles.tableCard} id="tagihan">
                                <div className={styles.tableTitle}>
                                    Tagihan & Riwayat Pembayaran
                                    <select
                                        value={filterTahun}
                                        onChange={(e) => setFilterTahun(e.target.value)}
                                        style={{
                                            float: "right",
                                            padding: "6px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #D1D5DB",
                                            fontSize: "13px",
                                            color: "#374151",
                                            backgroundColor: "#F9FAFB",
                                            cursor: "pointer",
                                            outline: "none",
                                        }}
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
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {activeTab === 'pembayaran' && (
                        <>
                            {/* Informasi Rekening Bank */}
                            <div className={styles.bankInfoCard} id="informasi">
                                <h3 className={styles.bankInfoTitle}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="5" width="20" height="14" rx="2" />
                                        <line x1="2" y1="10" x2="22" y2="10" />
                                    </svg>
                                    Informasi Rekening Bank
                                </h3>
                                <div className={styles.bankCardsGrid}>
                                    {/* Bendahara Putra */}
                                    <div className={styles.bankCard}>
                                        <div className={styles.bankCardLabel}>Bendahara Putra</div>
                                        <div className={styles.bankCardLogoRow}>
                                            <div className={styles.bankCardBankName}>Bank BRI</div>
                                        </div>
                                        <div className={styles.bankCardAccountRow}>
                                            <span className={styles.bankCardAccountNum}>1234-5678-9012</span>
                                        </div>
                                        <div className={styles.bankCardOwner}>a.n. PP Inayatullah Putra</div>
                                    </div>

                                    {/* Bendahara Putri */}
                                    <div className={`${styles.bankCard} ${styles.bankCardPutri}`}>
                                        <div className={styles.bankCardLabel}>Bendahara Putri</div>
                                        <div className={styles.bankCardLogoRow}>
                                            <div className={styles.bankCardBankName}>Bank BRI</div>
                                        </div>
                                        <div className={styles.bankCardAccountRow}>
                                            <span className={styles.bankCardAccountNum}>0987-6543-2109</span>
                                        </div>
                                        <div className={styles.bankCardOwner}>a.n. PP Inayatullah Putri</div>
                                    </div>
                                </div>
                                <p className={styles.bankInfoNote}>
                                    ⚠️ Harap transfer sesuai nominal tagihan dan lampirkan bukti transfer kepada bendahara.
                                </p>

                                {/* Kontak Bendahara */}
                                <div className={styles.contactSection}>
                                    <p className={styles.contactHeading}>
                                        Jika ada masalah dalam pembayaran, santri dapat menghubungi bendahara masing-masing:
                                    </p>
                                    <div className={styles.contactGrid}>
                                        {/* Bendahara Putra */}
                                        <div className={styles.contactCard}>
                                            <div className={styles.contactCardHeader}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="12" cy="7" r="4"></circle>
                                                </svg>
                                                Bendahara Putra
                                            </div>
                                            <div className={styles.contactName}>Abu Bakar</div>
                                            <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className={styles.contactWa}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                                </svg>
                                                0812-3456-7890
                                            </a>
                                            <div className={styles.contactNote}>(HANYA DILAYANI PADA JAM KERJA)</div>
                                        </div>

                                        {/* Bendahara Putri */}
                                        <div className={`${styles.contactCard} ${styles.contactCardPutri}`}>
                                            <div className={styles.contactCardHeader}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="12" cy="7" r="4"></circle>
                                                </svg>
                                                Bendahara Putri
                                            </div>
                                            <div className={styles.contactName}>Siti Aminah</div>
                                            <a href="https://wa.me/6289876543210" target="_blank" rel="noopener noreferrer" className={`${styles.contactWa} ${styles.contactWaPutri}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                                </svg>
                                                0898-7654-3210
                                            </a>
                                            <div className={styles.contactNote}>(HANYA DILAYANI PADA JAM KERJA)</div>
                                        </div>
                                    </div>

                                    {/* Jam Pelayanan & Lokasi */}
                                    <div className={styles.serviceInfo}>
                                        <div className={styles.serviceBlock}>
                                            <div className={styles.serviceBlockTitle}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <polyline points="12 6 12 12 16 14"></polyline>
                                                </svg>
                                                Jam Pelayanan
                                            </div>
                                            <div className={styles.serviceHours}>
                                                <div><span className={styles.serviceDay}>Senin s.d. Jumat</span><span className={styles.serviceTime}>08.00 – 14.00 WIB</span></div>
                                                <div><span className={styles.serviceDay}>Sabtu</span><span className={styles.serviceTime}>08.30 – 11.30 WIB</span></div>
                                                <div><span className={styles.serviceDay}>Minggu & Hari Libur</span><span className={styles.serviceClosed}>Tidak melayani</span></div>
                                            </div>
                                        </div>
                                        <div className={styles.serviceBlock}>
                                            <div className={styles.serviceBlockTitle}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                    <circle cx="12" cy="10" r="3"></circle>
                                                </svg>
                                                Lokasi
                                            </div>
                                            <p className={styles.serviceLocation}>Kantor Bendahara — Gedung Administrasi PP Inayatullah</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'akademik' && (
                        <>
                            {/* Informasi Pondok (Accordions) */}
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

                                            <div className={styles.infoTitle} style={{ marginTop: '24px' }}>🏫 Struktur Kelas Pondok Pesantren Inayatullah</div>
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
                        </>
                    )}

                    {activeTab === 'profil' && (
                        <>
                            {/* Profil Santri */}
                            <div className={styles.profilContainer}>
                                {/* Profile Hero Card */}
                                <div className={styles.profilHeroCard}>
                                    <div className={styles.profilAvatarWrapper}>
                                        <div className={styles.profilAvatar}>
                                            <span className={styles.profilAvatarText}>
                                                {santri.nama.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                                            </span>
                                        </div>
                                        <div className={styles.profilAvatarBadge}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="none">
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className={styles.profilHeroInfo}>
                                        <h2 className={styles.profilNama}>{santri.nama}</h2>
                                        <div className={styles.profilNisBadge}>NIS: {santri.nis}</div>
                                        <div className={styles.profilKelasBadge}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                                            </svg>
                                            {santri.kelas}
                                        </div>
                                    </div>
                                </div>

                                {/* Data Diri Grid */}
                                <div className={styles.profilDataGrid}>
                                    {/* Identitas Santri */}
                                    <div className={styles.profilDataCard}>
                                        <div className={styles.profilDataCardTitle}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9A4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                                <line x1="8" y1="21" x2="16" y2="21" />
                                                <line x1="12" y1="17" x2="12" y2="21" />
                                            </svg>
                                            Identitas Santri
                                        </div>
                                        <div className={styles.profilDataList}>
                                            <div className={styles.profilDataRow}>
                                                <span className={styles.profilDataLabel}>Nama Lengkap</span>
                                                <span className={styles.profilDataValue}>{santri.nama}</span>
                                            </div>
                                            <div className={styles.profilDataRow}>
                                                <span className={styles.profilDataLabel}>NIS</span>
                                                <span className={styles.profilDataValue}>
                                                    <span className={styles.profilNisCode}>{santri.nis}</span>
                                                </span>
                                            </div>
                                            <div className={styles.profilDataRow}>
                                                <span className={styles.profilDataLabel}>Kelas</span>
                                                <span className={styles.profilDataValue}>{santri.kelas}</span>
                                            </div>
                                            <div className={styles.profilDataRow}>
                                                <span className={styles.profilDataLabel}>Jenis Kelamin</span>
                                                <span className={styles.profilDataValue}>
                                                    {santri.jenis_kelamin === 'L' ? (
                                                        <span className={styles.profilGenderBadgePutra}>👦 Laki-laki</span>
                                                    ) : santri.jenis_kelamin === 'P' ? (
                                                        <span className={styles.profilGenderBadgePutri}>👧 Perempuan</span>
                                                    ) : '-'}
                                                </span>
                                            </div>
                                            <div className={styles.profilDataRow}>
                                                <span className={styles.profilDataLabel}>Tanggal Lahir</span>
                                                <span className={styles.profilDataValue}>
                                                    {santri.tanggal_lahir
                                                        ? new Date(santri.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                                                        : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Informasi Kontak */}
                                    <div className={styles.profilDataCard}>
                                        <div className={styles.profilDataCardTitle}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9A4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            Informasi Kontak
                                        </div>
                                        <div className={styles.profilDataList}>
                                            <div className={styles.profilDataRow}>
                                                <span className={styles.profilDataLabel}>Alamat</span>
                                                <span className={styles.profilDataValue}>{santri.alamat || '-'}</span>
                                            </div>
                                            <div className={styles.profilDataRow}>
                                                <span className={styles.profilDataLabel}>Gmail</span>
                                                <span className={styles.profilDataValue}>
                                                    {santri.email ? (
                                                        <a href={`mailto:${santri.email}`} className={styles.profilEmailLink}>{santri.email}</a>
                                                    ) : '-'}
                                                </span>
                                            </div>
                                            <div className={styles.profilDataRow}>
                                                <span className={styles.profilDataLabel}>Nama Wali</span>
                                                <span className={styles.profilDataValue}>{santri.nama_wali || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Catatan */}
                                <div className={styles.profilNote}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    Jika ada kesalahan data, silakan hubungi pengurus atau admin pondok untuk melakukan perubahan.
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'bantuan' && (
                        <>
                            {/* Instruksi Pembayaran */}
                            <div className={styles.instructionsCard}>
                                <h3 className={styles.instructionsTitle}>Tata Cara Pembayaran SPP / Tagihan</h3>
                                <ol className={styles.instructionsList}>
                                    <li>Login ke akun santri melalui website</li>
                                    <li>Pilih menu <strong>Tagihan</strong></li>
                                    <li>Perhatikan jumlah tagihan yang harus dibayar</li>
                                    <li>Lakukan transfer ke rekening berikut:
                                        <ul className={styles.bankList}>
                                            <li>Bank: <strong>BRI</strong></li>
                                            <li>No. Rekening: <strong>1234567890</strong></li>
                                            <li>Atas Nama: <strong>Pondok XXX</strong></li>
                                        </ul>
                                    </li>
                                    <li>Transfer sesuai dengan nominal tagihan (harap tidak kurang atau lebih)</li>
                                    <li>Setelah transfer, upload bukti pembayaran pada menu <strong>Upload Bukti</strong></li>
                                    <li>Tunggu proses verifikasi dari admin</li>
                                    <li>Status pembayaran akan berubah menjadi:
                                        <ul className={styles.statusList}>
                                            <li>⏳ Menunggu Verifikasi</li>
                                            <li>✅ Lunas (jika sudah disetujui)</li>
                                        </ul>
                                    </li>
                                </ol>
                            </div>

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
                                        <a href="https://wa.me/6281234567890?text=Assalamu'alaikum,%20saya%20ingin%20konsultasi%20terkait%20pembayaran%20SPP/Dispensasi." target="_blank" rel="noopener noreferrer" className={styles.faqChatBtn}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                            </svg>
                                            Chat Bendahara Putra
                                        </a>
                                        <a href="https://wa.me/6289876543210?text=Assalamu'alaikum,%20saya%20ingin%20konsultasi%20terkait%20pembayaran%20SPP/Dispensasi." target="_blank" rel="noopener noreferrer" className={`${styles.faqChatBtn} ${styles.faqChatBtnPutri}`}>
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
        </div>
    );
}

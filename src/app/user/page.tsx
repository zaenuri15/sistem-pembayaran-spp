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
}

export default function UserPage() {
    const router = useRouter();
    const [santri, setSantri] = useState<SantriProfile | null>(null);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTahun, setFilterTahun] = useState<string>("all");

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            const santriId = localStorage.getItem('user_santri_id');
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
                    dibayarkan: item.dibayarkan
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
            {/* Navbar */}
            <nav className={styles.navbar}>
                <div className={styles.navBrand}>
                    <Image
                        src="/images/logo.png"
                        alt="logo.png"
                        width={40}
                        height={40}
                    />
                    <div>
                        <div className={styles.navTitle}>PP Inayatullah</div>
                        <div className={styles.navSubtitle}>Portal Santri</div>
                    </div>
                </div>
                <div className={styles.navUser}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>{santri.nama}</span>
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
            <main className={styles.mainContent}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <h1 className={styles.greeting}>Assalamu&apos;alaikum, {santri.nama} 👋</h1>
                    <p className={styles.subtitle}>NIS: {santri.nis} &bull; Kelas: {santri.kelas}</p>
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

                {/* Informasi Rekening Bank */}
                <div className={styles.bankInfoCard}>
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

                {/* Footer */}
                <div className={styles.footer}>
                    &copy; {new Date().getFullYear()} Pondok Pesantren Inayatullah. Semua hak dilindungi.
                </div>
            </main>
        </div>
    );
}

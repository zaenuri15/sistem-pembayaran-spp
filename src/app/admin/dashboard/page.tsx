"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./dashboard.module.css";

interface SantriData {
    id: string; // ID Pembayaran
    santriId: string;
    nis: string;
    name: string;
    jenisKelamin: string;
    kelas: string;
    bulan: number;
    tahun: number;
    totalTagihan: number;
    dibayarkan: number;
}



export default function DashboardPage() {
    const [santriList, setSantriList] = useState<SantriData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedSantri, setSelectedSantri] = useState<SantriData | null>(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // Filter states — default to 'all' to show available data
    const [filterBulan, setFilterBulan] = useState<string>("all");
    const [filterTahun, setFilterTahun] = useState<string>("all");
    const [filterKelas, setFilterKelas] = useState<string>("all");
    const [filterGender, setFilterGender] = useState<string>("all");
    const [searchName, setSearchName] = useState<string>("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pembayaran')
                .select(`
                    id,
                    dibayarkan,
                    santri (
                        id,
                        nis,
                        nama,
                        jenis_kelamin,
                        kelas
                    ),
                    tagihan_batch (
                        bulan,
                        tahun,
                        total
                    )
                `);

            if (error) {
                console.error("Error fetching data:", error);
                return;
            }

            if (data) {
                const formattedData: SantriData[] = data.map((item: any) => ({
                    id: item.id, // ID Pembayaran
                    santriId: item.santri.id,
                    nis: item.santri.nis,
                    name: item.santri.nama,
                    jenisKelamin: item.santri.jenis_kelamin,
                    kelas: item.santri.kelas,
                    bulan: item.tagihan_batch.bulan,
                    tahun: item.tagihan_batch.tahun,
                    totalTagihan: item.tagihan_batch.total,
                    dibayarkan: item.dibayarkan
                }));
                // Sort by latest year/month/name
                formattedData.sort((a, b) => {
                    if (a.tahun !== b.tahun) return b.tahun - a.tahun;
                    if (a.bulan !== b.bulan) return b.bulan - a.bulan;
                    return a.name.localeCompare(b.name);
                });
                setSantriList(formattedData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Reset page when filters change
    const handleFilterBulan = (val: string) => { setFilterBulan(val); setCurrentPage(1); };
    const handleFilterTahun = (val: string) => { setFilterTahun(val); setCurrentPage(1); };
    const handleFilterKelas = (val: string) => { setFilterKelas(val); setCurrentPage(1); };
    const handleFilterGender = (val: string) => { setFilterGender(val); setCurrentPage(1); };
    const handleSearchName = (val: string) => { setSearchName(val); setCurrentPage(1); };

    // Derive unique filter options from data
    const availableYears = [...new Set(santriList.map((s) => s.tahun))].sort((a, b) => b - a);
    const availableKelas = [...new Set(santriList.map((s) => s.kelas))].sort();

    // Filter santri list
    const filteredList = santriList.filter((s) => {
        const matchBulan = filterBulan === "all" || s.bulan === Number(filterBulan);
        const matchTahun = filterTahun === "all" || s.tahun === Number(filterTahun);
        const matchKelas = filterKelas === "all" || s.kelas === filterKelas;
        const matchGender = filterGender === "all" || s.jenisKelamin === filterGender;
        const matchName = searchName === "" || s.name.toLowerCase().includes(searchName.toLowerCase());
        return matchBulan && matchTahun && matchKelas && matchGender && matchName;
    });

    // Pagination logic
    const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedList = filteredList.slice(startIndex, startIndex + itemsPerPage);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getMonthName = (monthIndex: number) => {
        return new Date(0, monthIndex - 1).toLocaleString("id-ID", { month: "long" });
    };

    const getStatus = (item: SantriData) => {
        if (item.dibayarkan >= item.totalTagihan) return "Lunas";
        if (item.dibayarkan > 0) return "Cicilan";
        return "Belum Lunas";
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "Lunas":
                return styles.badgeSuccess;
            case "Cicilan":
                return styles.badgeCicilan;
            default:
                return styles.badgeWarning;
        }
    };

    const handleOpenPaymentModal = (santri: SantriData) => {
        setSelectedSantri(santri);
        setPaymentAmount("");
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSantri) return;

        const amount = parseFloat(paymentAmount) || 0;
        const sisa = selectedSantri.totalTagihan - selectedSantri.dibayarkan;
        const minPayment = Math.min(25000, sisa);

        if (amount < minPayment) {
            alert(`Jumlah pembayaran minimal adalah ${formatCurrency(minPayment)}!`);
            return;
        }

        if (amount > sisa) {
            alert(`Jumlah pembayaran melebihi sisa tagihan (${formatCurrency(sisa)})!`);
            return;
        }

        try {
            const newDibayarkan = selectedSantri.dibayarkan + amount;

            // Update Supabase
            const { error } = await supabase
                .from('pembayaran')
                .update({ dibayarkan: newDibayarkan })
                .eq('id', selectedSantri.id);

            if (error) throw error;

            // Update Local State
            setSantriList((prev) =>
                prev.map((s) =>
                    s.id === selectedSantri.id
                        ? { ...s, dibayarkan: newDibayarkan }
                        : s
                )
            );

            alert(`Pembayaran ${formatCurrency(amount)} untuk ${selectedSantri.name} berhasil dicatat!`);
            setIsPaymentModalOpen(false);
            setSelectedSantri(null);
            setPaymentAmount("");
        } catch (err) {
            console.error("Error updating payment:", err);
            alert("Gagal menyimpan pembayaran. Coba lagi.");
        }
    };

    // Calculate summary stats from FILTERED data
    const totalPemasukan = filteredList.reduce((sum, s) => sum + s.dibayarkan, 0);
    const totalTagihanAll = filteredList.reduce((sum, s) => sum + s.totalTagihan, 0);
    const totalSisa = totalTagihanAll - totalPemasukan;
    const persentaseLunas = totalTagihanAll > 0 ? Math.round((totalPemasukan / totalTagihanAll) * 100) : 0;

    return (
        <div className={styles.pageContainer}>
            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                {/* Card 1: Pemasukan */}
                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <h2 className={styles.statValue}>{formatCurrency(totalPemasukan).replace("Rp", "").trim()}</h2>
                        <span className={styles.statLabel}>Pemasukan</span>
                    </div>
                    <div className={styles.progressBarContainer}>
                        <div className={styles.progressLabel}>
                            <span>Saldo Masuk</span>
                            <span>{persentaseLunas}%</span>
                        </div>
                    </div>
                </div>

                {/* Card 2: Sisa Tagihan */}
                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <h2 className={styles.statValue}>{formatCurrency(totalSisa).replace("Rp", "").trim()}</h2>
                        <span className={styles.statLabel}>Sisa Tagihan</span>
                    </div>
                    <div className={styles.progressBarContainer}>
                        <div className={styles.progressLabel}>
                            <span>Belum Terbayar</span>
                            <span>{100 - persentaseLunas}%</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Total Tagihan */}
                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <h2 className={styles.statValue}>{formatCurrency(totalTagihanAll).replace("Rp", "").trim()}</h2>
                        <span className={styles.statLabel}>Total Tagihan</span>
                    </div>
                    <div className={styles.progressBarContainer}>
                        <div className={styles.progressLabel}>
                            <span>Total Keseluruhan</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table Section */}
            <div className={styles.tableSection}>
                {/* Filter Bar */}
                <div className={styles.filterBar}>
                    <div className={styles.filterRow}>
                        <div className={styles.filterItem}>
                            <label className={styles.filterLabel}>Bulan</label>
                            <select
                                value={filterBulan}
                                onChange={(e) => handleFilterBulan(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="all">Semua Bulan</option>
                                {[...Array(12)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {new Date(0, i).toLocaleString("id-ID", { month: "long" })}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label className={styles.filterLabel}>Tahun</label>
                            <select
                                value={filterTahun}
                                onChange={(e) => handleFilterTahun(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="all">Semua Tahun</option>
                                {availableYears.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label className={styles.filterLabel}>Kelas</label>
                            <select
                                value={filterKelas}
                                onChange={(e) => handleFilterKelas(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="all">Semua Kelas</option>
                                {availableKelas.map((kelas) => (
                                    <option key={kelas} value={kelas}>{kelas}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label className={styles.filterLabel}>Jenis Kelamin</label>
                            <select
                                value={filterGender}
                                onChange={(e) => handleFilterGender(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="all">Semua</option>
                                <option value="L">Laki-laki</option>
                                <option value="P">Perempuan</option>
                            </select>
                        </div>

                        <div className={styles.filterItem} style={{ flexGrow: 1, minWidth: '200px', marginLeft: '12px' }}>
                            <label className={styles.filterLabel}>Pencarian Nama</label>
                            <div className={styles.searchWrapper} style={{ width: '100%' }}>
                                <svg className={styles.searchIconSmall} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    className={styles.tableSearch}
                                    placeholder="Cari nama santri..."
                                    value={searchName}
                                    onChange={(e) => handleSearchName(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.filterRight}>
                        <div className={styles.rowsPerPage}>
                            <span className={styles.rowsLabel}>Tampilkan</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className={styles.rowsSelect}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className={styles.rowsLabel}>baris</span>
                        </div>
                        <span className={styles.filterInfo}>
                            Menampilkan {filteredList.length} dari {santriList.length} santri
                        </span>
                    </div>
                </div>

                {/* Table */}
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>NIS</th>
                                <th>Nama Santri</th>
                                <th>Kelas</th>
                                <th>Bulan</th>
                                <th>Total Tagihan</th>
                                <th>Dibayarkan</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'center' }}>Input Pembayaran</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedList.length > 0 ? (
                                paginatedList.map((item) => {
                                    const status = getStatus(item);
                                    const sisa = item.totalTagihan - item.dibayarkan;
                                    return (
                                        <tr key={item.id}>
                                            <td>{item.nis}</td>
                                            <td>
                                                <span className={styles.santriName}>{item.name}</span>
                                            </td>
                                            <td>
                                                <span className={styles.kelasBadge}>{item.kelas}</span>
                                            </td>
                                            <td>{getMonthName(item.bulan)} {item.tahun}</td>
                                            <td>{formatCurrency(item.totalTagihan)}</td>
                                            <td>
                                                <div className={styles.dibayarkanCell}>
                                                    <span className={styles.dibayarkanAmount}>
                                                        {formatCurrency(item.dibayarkan)}
                                                    </span>
                                                    {sisa > 0 && (
                                                        <span className={styles.sisaAmount}>
                                                            Sisa: {formatCurrency(sisa)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${getStatusStyle(status)}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {status !== "Lunas" ? (
                                                    <button
                                                        className={styles.paymentBtn}
                                                        onClick={() => handleOpenPaymentModal(item)}
                                                        title={`Input pembayaran untuk ${item.name}`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect x="2" y="5" width="20" height="14" rx="2" />
                                                            <line x1="2" y1="10" x2="22" y2="10" />
                                                        </svg>
                                                        <span>Bayar</span>
                                                    </button>
                                                ) : (
                                                    <span className={styles.paidIcon}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                        </svg>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "#6B7280" }}>
                                        Belum ada data pembayaran yang sesuai filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className={styles.pagination}>
                    <span className={styles.paginationInfo}>
                        Halaman {currentPage} dari {totalPages}
                    </span>
                    <div className={styles.paginationButtons}>
                        <button
                            className={`${styles.pageBtnNav} ${currentPage === 1 ? styles.pageBtnDisabled : ''}`}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                            Previous
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                className={`${styles.pageBtn} ${currentPage === i + 1 ? styles.pageBtnActive : ''}`}
                                onClick={() => setCurrentPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            className={`${styles.pageBtnNav} ${currentPage === totalPages ? styles.pageBtnDisabled : ''}`}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Input Modal */}
            {isPaymentModalOpen && selectedSantri && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Input Pembayaran</h3>
                            <button
                                className={styles.closeButton}
                                onClick={() => setIsPaymentModalOpen(false)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handlePaymentSubmit}>
                            <div className={styles.modalBody}>
                                {/* Santri Info */}
                                <div className={styles.paymentInfo}>
                                    <div className={styles.paymentInfoRow}>
                                        <span className={styles.paymentInfoLabel}>Nama Santri</span>
                                        <span className={styles.paymentInfoValue}>{selectedSantri.name}</span>
                                    </div>
                                    <div className={styles.paymentInfoRow}>
                                        <span className={styles.paymentInfoLabel}>NIS</span>
                                        <span className={styles.paymentInfoValue}>{selectedSantri.nis}</span>
                                    </div>
                                    <div className={styles.paymentInfoRow}>
                                        <span className={styles.paymentInfoLabel}>Kelas</span>
                                        <span className={styles.paymentInfoValue}>{selectedSantri.kelas}</span>
                                    </div>
                                    <div className={styles.paymentInfoRow}>
                                        <span className={styles.paymentInfoLabel}>Total Tagihan</span>
                                        <span className={styles.paymentInfoValue}>{formatCurrency(selectedSantri.totalTagihan)}</span>
                                    </div>
                                    <div className={styles.paymentInfoRow}>
                                        <span className={styles.paymentInfoLabel}>Sudah Dibayar</span>
                                        <span className={styles.paymentInfoValue} style={{ color: '#0D9A4E' }}>
                                            {formatCurrency(selectedSantri.dibayarkan)}
                                        </span>
                                    </div>
                                    <div className={`${styles.paymentInfoRow} ${styles.paymentInfoHighlight}`}>
                                        <span className={styles.paymentInfoLabel}>Sisa Tagihan</span>
                                        <span className={styles.paymentInfoValue} style={{ color: '#DC2626', fontWeight: 700 }}>
                                            {formatCurrency(selectedSantri.totalTagihan - selectedSantri.dibayarkan)}
                                        </span>
                                    </div>
                                </div>

                                {/* Payment Input */}
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Jumlah Pembayaran *</label>
                                    <div className={styles.currencyInputWrapper}>
                                        <span className={styles.currencyPrefix}>Rp</span>
                                        <input
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            className={`${styles.formInput} ${styles.formInputCurrency}`}
                                            placeholder="Contoh: 25000"
                                            min={Math.min(25000, selectedSantri.totalTagihan - selectedSantri.dibayarkan)}
                                            max={selectedSantri.totalTagihan - selectedSantri.dibayarkan}
                                            required
                                        />
                                    </div>
                                    <span className={styles.inputHint}>
                                        Maksimal: {formatCurrency(selectedSantri.totalTagihan - selectedSantri.dibayarkan)}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button
                                    type="button"
                                    className={styles.btnCancel}
                                    onClick={() => setIsPaymentModalOpen(false)}
                                >
                                    Batal
                                </button>
                                <button type="submit" className={styles.btnSave}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="5" width="20" height="14" rx="2" />
                                        <line x1="2" y1="10" x2="22" y2="10" />
                                    </svg>
                                    Simpan Pembayaran
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

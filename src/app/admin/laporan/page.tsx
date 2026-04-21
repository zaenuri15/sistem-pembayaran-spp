"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import styles from "./laporan.module.css";

interface LaporanItem {
    id: number;
    nis: string;
    nama: string;
    kelas: string;
    dibayarkan: number;
}

export default function LaporanKeuanganPage() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [selectedBulan, setSelectedBulan] = useState<number>(currentMonth);
    const [selectedTahun, setSelectedTahun] = useState<number>(currentYear);
    
    const [laporanList, setLaporanList] = useState<LaporanItem[]>([]);
    const [totalPemasukan, setTotalPemasukan] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);

    useEffect(() => {
        fetchAvailableYears();
    }, []);

    useEffect(() => {
        fetchLaporan(selectedBulan, selectedTahun);
    }, [selectedBulan, selectedTahun]);

    const fetchAvailableYears = async () => {
        const { data, error } = await supabase
            .from('tagihan_batch')
            .select('tahun');
        
        if (!error && data) {
            const years = Array.from(new Set(data.map((item: any) => item.tahun))).sort((a: any, b: any) => b - a);
            if (years.length > 0) setAvailableYears(years as number[]);
        }
    };

    const fetchLaporan = async (bulan: number, tahun: number) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('pembayaran')
                .select(`
                    id,
                    dibayarkan,
                    santri!inner (
                        nis,
                        nama,
                        kelas
                    ),
                    tagihan_batch!inner (
                        bulan,
                        tahun
                    )
                `)
                .eq('tagihan_batch.bulan', bulan)
                .eq('tagihan_batch.tahun', tahun)
                .gt('dibayarkan', 0);

            if (error) {
                console.error("Error fetching laporan:", error);
                return;
            }

            if (data) {
                let total = 0;
                const formattedList: LaporanItem[] = data.map((item: any) => {
                    total += item.dibayarkan;
                    return {
                        id: item.id,
                        nis: item.santri.nis,
                        nama: item.santri.nama,
                        kelas: item.santri.kelas,
                        dibayarkan: item.dibayarkan,
                    };
                });
                
                // Urutkan berdasarkan nama
                formattedList.sort((a, b) => a.nama.localeCompare(b.nama));
                
                setLaporanList(formattedList);
                setTotalPemasukan(total);
            } else {
                setLaporanList([]);
                setTotalPemasukan(0);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

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

    return (
        <div className={styles.pageContainer}>
            {/* Print-only header: Kop Surat dengan Logo */}
            <div className={styles.printHeader}>
                <div className={styles.printLogoRow}>
                    <Image
                        src="/images/logo.png"
                        alt="Logo PP Inayatullah"
                        width={80}
                        height={80}
                        style={{ borderRadius: '50%' }}
                    />
                    <div className={styles.printSchoolInfo}>
                        <div className={styles.printSchoolSub}>Yayasan Pondok Pesantren</div>
                        <div className={styles.printSchoolName}>PONDOK PESANTREN INAYATULLAH</div>
                        <div className={styles.printSchoolAddress}>Jl. Monjali 20, Nandan Sariharjo, Ngaglik, Sleman, Yogyakarta 55581 | Telp: 0812-XXXX-XXXX</div>
                    </div>
                </div>
                <div className={styles.printDivider}></div>
                <div className={styles.printReportTitle}>LAPORAN REKAPITULASI PEMBAYARAN SPP</div>
                <div className={styles.printReportPeriod}>Periode: {getMonthName(selectedBulan)} {selectedTahun}</div>
                <div className={styles.printReportDate}>Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>

            <div className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className={styles.title}>Laporan Keuangan</h1>
                        <p className={styles.subtitle}>Riwayat pemasukan SPP diakumulasikan berdasarkan bulan tagihan.</p>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className={styles.btnPrint}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                            <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                        Cetak / Export PDF
                    </button>
                </div>
            </div>

            <div className={styles.filterCard}>
                <div className={styles.filterItem}>
                    <label className={styles.filterLabel}>Pilih Bulan</label>
                    <select
                        value={selectedBulan}
                        onChange={(e) => setSelectedBulan(Number(e.target.value))}
                        className={styles.filterSelect}
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {getMonthName(i + 1)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterItem}>
                    <label className={styles.filterLabel}>Pilih Tahun</label>
                    <select
                        value={selectedTahun}
                        onChange={(e) => setSelectedTahun(Number(e.target.value))}
                        className={styles.filterSelect}
                    >
                        {availableYears.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={styles.reportGrid}>
                <div className={styles.reportCard}>
                    <div className={styles.reportIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                    </div>
                    <span className={styles.reportLabel}>Total Pemasukan Bulan {getMonthName(selectedBulan)} {selectedTahun}</span>
                    <span className={styles.reportValue}>
                        {isLoading ? "..." : formatCurrency(totalPemasukan)}
                    </span>
                </div>
            </div>

            <div className={styles.tableSection}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>
                    Rincian Pembayaran Santri
                </h3>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>NIS</th>
                                <th>Nama Santri</th>
                                <th>Kelas</th>
                                <th>Nominal Dibayarkan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className={styles.noData}>Memuat data laporan...</td>
                                </tr>
                            ) : laporanList.length > 0 ? (
                                laporanList.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td>{item.nis}</td>
                                        <td style={{ fontWeight: 500, color: '#111827' }}>{item.nama}</td>
                                        <td>{item.kelas}</td>
                                        <td style={{ color: '#0D9A4E', fontWeight: 600 }}>{formatCurrency(item.dibayarkan)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className={styles.noData}>
                                        Tidak ada pemasukan untuk periode {getMonthName(selectedBulan)} {selectedTahun}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Print-only footer: Tanda Tangan */}
            <div className={styles.printFooter}>
                <div className={styles.printSummaryRow}>
                    <div className={styles.printSummaryItem}>
                        <span>Total Santri Bayar:</span>
                        <strong>{laporanList.length} Santri</strong>
                    </div>
                    <div className={styles.printSummaryItem}>
                        <span>Total Pemasukan:</span>
                        <strong>{formatCurrency(totalPemasukan)}</strong>
                    </div>
                </div>
                <div className={styles.printSignatureRow}>
                    <div className={styles.printSignatureBox}>
                        <p>Sleman, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Mengetahui,<br />Kepala PP Inayatullah</p>
                        <div className={styles.printSignatureSpace}></div>
                        <div className={styles.printSignatureName}>(_________________________)</div>
                    </div>
                    <div className={styles.printSignatureBox}>
                        <p>Sleman, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Dibuat oleh,<br />Bagian Administrasi &amp; Keuangan</p>
                        <div className={styles.printSignatureSpace}></div>
                        <div className={styles.printSignatureName}>ADMINISTRATOR SISTEM</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

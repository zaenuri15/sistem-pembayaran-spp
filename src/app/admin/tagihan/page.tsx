"use client";

import { useState, useEffect } from "react";
import styles from "./tagihan.module.css";

interface TagihanBatch {
    id: number;
    bulan: number;
    tahun: number;
    spp: number;
    kebersihan: number;
    konsumsi: number;
    pembangunan: number;
    total: number;
}

export default function TagihanPage() {
    const [batches, setBatches] = useState<TagihanBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    
    // Form State
    const [formData, setFormData] = useState({
        bulan: new Date().getMonth() + 1,
        tahun: new Date().getFullYear(),
        spp: "",
        kebersihan: "",
        konsumsi: "",
        pembangunan: "",
    });
    const [totalTagihan, setTotalTagihan] = useState(0);

    // Fetch Batches
    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/tagihan');
            const result = await response.json();
            
            if (result.success) {
                setBatches(result.data || []);
            } else {
                console.error("Error fetching batches:", result.error);
            }
        } catch (error) {
            console.error("Error fetching batches:", error);
        } finally {
            setLoading(false);
        }
    };

    // Get unique years from batches for the filter dropdown
    const availableYears = [...new Set(batches.map((b) => b.tahun))].sort((a, b) => b - a);

    // Filter batches by selected year
    const filteredBatches = selectedYear === "all"
        ? batches
        : batches.filter((b) => b.tahun === Number(selectedYear));

    // Calculate total automatically
    useEffect(() => {
        const spp = parseFloat(formData.spp) || 0;
        const kebersihan = parseFloat(formData.kebersihan) || 0;
        const konsumsi = parseFloat(formData.konsumsi) || 0;
        const pembangunan = parseFloat(formData.pembangunan) || 0;
        setTotalTagihan(spp + kebersihan + konsumsi + pembangunan);
    }, [formData.spp, formData.kebersihan, formData.konsumsi, formData.pembangunan]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
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

    const handleEdit = (batch: TagihanBatch) => {
        setIsEditMode(true);
        setEditId(batch.id);
        setFormData({
            bulan: batch.bulan,
            tahun: batch.tahun,
            spp: batch.spp.toString(),
            kebersihan: batch.kebersihan.toString(),
            konsumsi: batch.konsumsi.toString(),
            pembangunan: batch.pembangunan.toString(),
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Apakah Anda yakin ingin menghapus data tagihan ini?")) {
            try {
                const { supabase } = await import("@/lib/supabase");
                const { error } = await supabase.from('tagihan_batch').delete().eq('id', id);
                if (error) {
                    alert("Gagal menghapus data!");
                    console.error(error);
                } else {
                    fetchBatches();
                }
            } catch (err) {
                console.error(err);
                alert("Terjadi kesalahan.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (isEditMode && editId) {
                const { supabase } = await import("@/lib/supabase");
                const { error } = await supabase.from('tagihan_batch').update({
                    bulan: Number(formData.bulan),
                    tahun: Number(formData.tahun),
                    spp: parseFloat(formData.spp) || 0,
                    kebersihan: parseFloat(formData.kebersihan) || 0,
                    konsumsi: parseFloat(formData.konsumsi) || 0,
                    pembangunan: parseFloat(formData.pembangunan) || 0,
                }).eq('id', editId);
                
                if (error) throw error;
                alert("Data tagihan berhasil diubah!");
            } else {
                const response = await fetch('/api/tagihan/batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        bulan: Number(formData.bulan),
                        tahun: Number(formData.tahun),
                        spp: formData.spp,
                        kebersihan: formData.kebersihan,
                        konsumsi: formData.konsumsi,
                        pembangunan: formData.pembangunan,
                    }),
                });

                const result = await response.json();

                if (!result.success) {
                    alert(result.error || 'Gagal membuat tagihan');
                    return;
                }

                alert(result.message || `Sukses! Tagihan berhasil dibuat.`);
            }
            
            fetchBatches(); // Refresh list
            setIsModalOpen(false);
            
            // Reset form
            setFormData({
                bulan: new Date().getMonth() + 1,
                tahun: new Date().getFullYear(),
                spp: "",
                kebersihan: "",
                konsumsi: "",
                pembangunan: "",
            });

        } catch (err: any) {
            console.error(err);
            alert("Terjadi kesalahan: " + (err.message || "Gagal menyimpan data"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>Data Keuangan</h1>
                <button className={styles.btnAdd} onClick={() => {
                    setIsEditMode(false);
                    setEditId(null);
                    setFormData({
                        bulan: new Date().getMonth() + 1,
                        tahun: new Date().getFullYear(),
                        spp: "",
                        kebersihan: "",
                        konsumsi: "",
                        pembangunan: "",
                    });
                    setIsModalOpen(true);
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Input Keuangan
                </button>
            </div>

            {/* Year Filter */}
            <div className={styles.filterSection}>
                <div className={styles.filterGroup}>
                    <label htmlFor="filterTahun" className={styles.filterLabel}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Filter Tahun:
                    </label>
                    <select
                        id="filterTahun"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="all">Semua Tahun</option>
                        {availableYears.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
                <span className={styles.filterInfo}>
                    Menampilkan {filteredBatches.length} dari {batches.length} data
                </span>
            </div>

            {/* Batches Table */}
            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Bulan</th>
                            <th>Tahun</th>
                            <th>SPP</th>
                            <th>Kebersihan</th>
                            <th>Konsumsi</th>
                            <th>Pembangunan</th>
                            <th>Total Tagihan (Per Santri)</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBatches.map((batch) => (
                            <tr key={batch.id}>
                                <td>{getMonthName(batch.bulan)}</td>
                                <td>{batch.tahun}</td>
                                <td>{formatCurrency(batch.spp)}</td>
                                <td>{formatCurrency(batch.kebersihan)}</td>
                                <td>{formatCurrency(batch.konsumsi)}</td>
                                <td>{formatCurrency(batch.pembangunan)}</td>
                                <td>
                                    <span style={{ fontWeight: 700, color: '#0D9A4E' }}>
                                        {formatCurrency(batch.total)}
                                    </span>
                                </td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            className={`${styles.btnAction} ${styles.btnEdit}`}
                                            onClick={() => handleEdit(batch)}
                                            title="Edit"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                        <button
                                            className={`${styles.btnAction} ${styles.btnDelete}`}
                                            onClick={() => handleDelete(batch.id)}
                                            title="Hapus"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Input Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>{isEditMode ? "Edit Tagihan Bulanan" : "Input Tagihan Bulanan"}</h3>
                            <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className={styles.modalBody}>
                                <div className={styles.formGrid}>
                                    {/* Bulan & Tahun */}
                                    <div className={styles.formGroup}>
                                        <label htmlFor="bulan" className={styles.label}>Bulan *</label>
                                        <select
                                            id="bulan"
                                            name="bulan"
                                            value={formData.bulan}
                                            onChange={handleInputChange}
                                            className={styles.select}
                                            required
                                        >
                                            {[...Array(12)].map((_, i) => (
                                                <option key={i + 1} value={i + 1}>
                                                    {new Date(0, i).toLocaleString("id-ID", { month: "long" })}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="tahun" className={styles.label}>Tahun *</label>
                                        <select
                                            id="tahun"
                                            name="tahun"
                                            value={formData.tahun}
                                            onChange={handleInputChange}
                                            className={styles.select}
                                            required
                                        >
                                            <option value={2025}>2025</option>
                                            <option value={2026}>2026</option>
                                        </select>
                                    </div>

                                    {/* Rincian Inputs */}
                                    <div className={`${styles.fullWidth}`} style={{ marginTop: '8px', borderBottom: '1px solid #E5E7EB' }}>
                                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Rincian Tagihan (Per Santri)</h4>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="spp" className={styles.label}>SPP Bulanan</label>
                                        <div className={styles.currencyWrapper}>
                                            <span className={styles.currencySymbol}>Rp</span>
                                            <input type="number" name="spp" value={formData.spp} onChange={handleInputChange} className={`${styles.input} ${styles.inputCurrency}`} placeholder="0" min="0" />
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="kebersihan" className={styles.label}>Kebersihan</label>
                                        <div className={styles.currencyWrapper}>
                                            <span className={styles.currencySymbol}>Rp</span>
                                            <input type="number" name="kebersihan" value={formData.kebersihan} onChange={handleInputChange} className={`${styles.input} ${styles.inputCurrency}`} placeholder="0" min="0" />
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="konsumsi" className={styles.label}>Konsumsi</label>
                                        <div className={styles.currencyWrapper}>
                                            <span className={styles.currencySymbol}>Rp</span>
                                            <input type="number" name="konsumsi" value={formData.konsumsi} onChange={handleInputChange} className={`${styles.input} ${styles.inputCurrency}`} placeholder="0" min="0" />
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="pembangunan" className={styles.label}>Pembangunan</label>
                                        <div className={styles.currencyWrapper}>
                                            <span className={styles.currencySymbol}>Rp</span>
                                            <input type="number" name="pembangunan" value={formData.pembangunan} onChange={handleInputChange} className={`${styles.input} ${styles.inputCurrency}`} placeholder="0" min="0" />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.totalSection}>
                                    <span className={styles.totalLabel}>Total Tagihan:</span>
                                    <span className={styles.totalValue}>{formatCurrency(totalTagihan)}</span>
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>Batal</button>
                                <button type="submit" className={styles.btnSave}>Simpan Data</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

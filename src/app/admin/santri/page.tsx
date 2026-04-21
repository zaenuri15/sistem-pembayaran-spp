"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./santri.module.css";

// Interface matches Supabase table + UI needs
interface Santri {
    id: number; // Database ID (BigInt)
    nis: string;
    nama: string; // Match DB column 'nama'
    jenis_kelamin: string; // DB: 'jenis_kelamin'
    tanggal_lahir: string; // DB: 'tanggal_lahir'
    password: string;
    kelas: string;
    alamat: string;
    nama_wali: string; // DB: 'nama_wali'
}

export default function DataSantriPage() {
    const [santriList, setSantriList] = useState<Santri[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [filterGender, setFilterGender] = useState<string>("all");
    const [filterKelas, setFilterKelas] = useState<string>("all");
    const [searchName, setSearchName] = useState<string>("");

    // Form State
    const [formData, setFormData] = useState({
        id: 0, // DB ID
        nis: "",
        name: "", // UI field name
        jenisKelamin: "", // UI field name
        tanggalLahir: "",
        password: "",
        kelas: "",
        alamat: "",
        namaWali: ""
    });

    useEffect(() => {
        fetchSantri();
    }, []);

    const fetchSantri = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('santri')
            .select('*')
            .order('nis', { ascending: true }); // Order by NIS

        if (error) console.error("Error fetching santri:", error);
        else setSantriList(data || []);
        setIsLoading(false);
    };

    // Generate password from date of birth: DDMMYY
    const generatePassword = (dateStr: string) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const dd = String(date.getDate()).padStart(2, "0");
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yy = String(date.getFullYear()).slice(-2);
        return dd + mm + yy;
    };

    // Generate NIS: YY + GenderCode + 3-digit increment
    const generateNIS = (gender: string) => {
        const yearCode = String(new Date().getFullYear()).slice(-2); // e.g. "26"
        const genderCode = gender === "L" ? "01" : "02";
        const prefix = yearCode + genderCode;

        // Find the highest increment for this prefix
        const existingNums = santriList
            .filter((s) => s.nis.startsWith(prefix))
            .map((s) => parseInt(s.nis.slice(4), 10) || 0);
        const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
        return prefix + String(nextNum).padStart(3, "0");
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const updated = { ...prev, [name]: value };
            // Auto-regenerate NIS when gender changes (only in add mode)
            if (name === "jenisKelamin" && !isEditMode) {
                updated.nis = generateNIS(value);
            }
            // Auto-generate password when date of birth changes
            if (name === "tanggalLahir") {
                updated.password = generatePassword(value);
            }
            return updated;
        });
    };

    const handleAdd = () => {
        setIsEditMode(false);
        setFormData({
            id: 0,
            nis: "",
            name: "",
            jenisKelamin: "",
            tanggalLahir: "",
            password: "",
            kelas: "",
            alamat: "",
            namaWali: ""
        });
        setIsModalOpen(true);
    };

    const handleEdit = (santri: Santri) => {
        setIsEditMode(true);
        // Map DB columns to Form fields
        setFormData({
            id: santri.id,
            nis: santri.nis,
            name: santri.nama,
            jenisKelamin: santri.jenis_kelamin,
            tanggalLahir: santri.tanggal_lahir, // ensure format YYYY-MM-DD
            password: santri.password,
            kelas: santri.kelas,
            alamat: santri.alamat,
            namaWali: santri.nama_wali
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Apakah Anda yakin ingin menghapus data santri ini?")) {
            const { error } = await supabase.from('santri').delete().eq('id', id);
            if (error) {
                alert("Gagal menghapus data.");
                console.error(error);
            } else {
                fetchSantri(); // Refresh list
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prepare data for DB
        const dbData = {
            nis: formData.nis,
            nama: formData.name,
            jenis_kelamin: formData.jenisKelamin,
            tanggal_lahir: formData.tanggalLahir,
            password: formData.password,
            kelas: formData.kelas,
            alamat: formData.alamat,
            nama_wali: formData.namaWali
        };

        if (isEditMode) {
            // Update logic
            const { error } = await supabase
                .from('santri')
                .update(dbData)
                .eq('id', formData.id);

            if (error) {
                alert("Gagal update data!");
                console.error(error);
            } else {
                alert("Data santri berhasil diperbarui!");
                fetchSantri();
                setIsModalOpen(false);
            }
        } else {
            // Add logic
            // Ensure NIS is generated if missing (though form handles it)
            if (!dbData.nis) {
                // Fallback if user didn't select gender properly or something
                alert("NIS belum terbentuk. Pastikan pilih jenis kelamin.");
                return;
            }

            const { data: newSantri, error } = await supabase
                .from('santri')
                .insert([dbData])
                .select()
                .single();

            if (error) {
                alert("Gagal menambah data! (Cek apakah NIS sudah ada)");
                console.log(error);
            } else {
                // Auto-generate payments for existing batches of current year
                try {
                    const currentYear = new Date().getFullYear();
                    // alert(`Debug: Checking batches for year ${currentYear}`); // Debug

                    const { data: batches, error: batchError } = await supabase
                        .from('tagihan_batch')
                        .select('id, total')
                        .eq('tahun', currentYear);

                    if (batchError) {
                        alert("Debug Error fetching batches: " + batchError.message);
                    } else if (batches && batches.length > 0) {
                        alert(`Debug: Ditemukan ${batches.length} tagihan batch untuk tahun ${currentYear}. Membuat pembayaran...`);

                        const paymentPayloads = batches.map((batch: any) => ({
                            santri_id: newSantri.id,
                            tagihan_batch_id: batch.id,
                            total_tagihan: batch.total,
                            dibayarkan: 0
                        }));

                        const { error: paymentError } = await supabase.from('pembayaran').insert(paymentPayloads);
                        if (paymentError) {
                            alert("Debug Error creating payments: " + paymentError.message);
                            console.error("Error creating payments:", paymentError);
                        } else {
                            alert("Debug: Pembayaran berhasil dibuat otomatis.");
                        }
                    } else {
                        alert(`Debug: TIDAK ada tagihan batch ditemukan untuk tahun ${currentYear}. Cek tabel tagihan_batch.`);
                    }
                } catch (paymentErr: any) {
                    console.error("Payment generation error:", paymentErr);
                    alert("Debug Exception: " + paymentErr.message);
                }

                alert("Data santri berhasil ditambahkan! (Silakan cek tagihan)");
                fetchSantri();
                setIsModalOpen(false);
            }
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>Data Santri</h1>
                <button className={styles.btnAdd} onClick={handleAdd}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Tambah Santri
                </button>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.filterBar}>
                    <div className={styles.filterItem}>
                        <label className={styles.filterLabel}>Jenis Kelamin</label>
                        <select
                            value={filterGender}
                            onChange={(e) => setFilterGender(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">Semua</option>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                        </select>
                    </div>
                    <div className={styles.filterItem}>
                        <label className={styles.filterLabel}>Kelas</label>
                        <select
                            value={filterKelas}
                            onChange={(e) => setFilterKelas(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">Semua Kelas</option>
                            <option value="Ibtida'">Ibtida&apos;</option>
                            <option value="Jurumiyah">Jurumiyah</option>
                            <option value="Imrithi">Imrithi</option>
                            <option value="Alfiyah 1">Alfiyah 1</option>
                            <option value="Alfiyah 2">Alfiyah 2</option>
                            <option value="Musyawirin">Musyawirin</option>
                        </select>
                    </div>
                    <div className={styles.filterItem} style={{ flexGrow: 1, minWidth: '200px', marginLeft: '12px' }}>
                        <label className={styles.filterLabel}>Pencarian Nama</label>
                        <input
                            type="text"
                            className={styles.filterSelect}
                            placeholder="Cari nama santri..."
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            style={{ width: '100%', cursor: 'text' }}
                        />
                    </div>
                    <span className={styles.filterInfo} style={{ marginLeft: 'auto' }}>
                        Menampilkan {santriList.filter(s => (filterGender === "all" || s.jenis_kelamin === filterGender) && (filterKelas === "all" || s.kelas === filterKelas) && (searchName === "" || s.nama.toLowerCase().includes(searchName.toLowerCase()))).length} dari {santriList.length} santri
                    </span>
                </div>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>NIS</th>
                            <th>Nama Santri</th>
                            <th>L/P</th>
                            <th>Tgl. Lahir</th>
                            <th>Kelas</th>
                            <th>Alamat</th>
                            <th>Nama Wali</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {santriList.filter(s =>
                            (filterGender === "all" || s.jenis_kelamin === filterGender) &&
                            (filterKelas === "all" || s.kelas === filterKelas) &&
                            (searchName === "" || s.nama.toLowerCase().includes(searchName.toLowerCase()))
                        ).map((santri) => (
                            <tr key={santri.id}>
                                <td>{santri.nis}</td>
                                <td>{santri.nama}</td>
                                <td>{santri.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}</td>
                                <td>{santri.tanggal_lahir ? new Date(santri.tanggal_lahir).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}</td>
                                <td>{santri.kelas}</td>
                                <td>{santri.alamat}</td>
                                <td>{santri.nama_wali}</td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            className={`${styles.btnAction} ${styles.btnEdit}`}
                                            onClick={() => handleEdit(santri)}
                                            title="Edit"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                        <button
                                            className={`${styles.btnAction} ${styles.btnDelete}`}
                                            onClick={() => handleDelete(santri.id)}
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

            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                {isEditMode ? "Edit Data Santri" : "Tambah Santri Baru"}
                            </h3>
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
                                    <div className={styles.formGroup}>
                                        <label htmlFor="id" className={styles.label}>NIS (Nomor Induk Santri)</label>
                                        <input
                                            type="text"
                                            id="id"
                                            name="id"
                                            value={formData.id || ""}
                                            className={styles.input}
                                            placeholder="Otomatis terisi"
                                            readOnly
                                            style={{ backgroundColor: '#F3F4F6', cursor: 'not-allowed' }}
                                        />
                                        {!isEditMode && (
                                            <span className={styles.inputHint}>NIS akan otomatis digenerate setelah memilih jenis kelamin</span>
                                        )}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="name" className={styles.label}>Nama Lengkap <span className={styles.required}>*</span></label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className={styles.input}
                                            placeholder="Masukkan nama santri"
                                            required
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="jenisKelamin" className={styles.label}>Jenis Kelamin <span className={styles.required}>*</span></label>
                                        <select
                                            id="jenisKelamin"
                                            name="jenisKelamin"
                                            value={formData.jenisKelamin}
                                            onChange={handleInputChange}
                                            className={styles.input}
                                            required
                                            disabled={isEditMode}
                                            style={isEditMode ? { backgroundColor: '#F3F4F6', cursor: 'not-allowed' } : {}}
                                        >
                                            <option value="" disabled>Pilih Jenis Kelamin</option>
                                            <option value="L">Laki-laki (01)</option>
                                            <option value="P">Perempuan (02)</option>
                                        </select>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="tanggalLahir" className={styles.label}>Tanggal Lahir <span className={styles.required}>*</span></label>
                                        <input
                                            type="date"
                                            id="tanggalLahir"
                                            name="tanggalLahir"
                                            value={formData.tanggalLahir}
                                            onChange={handleInputChange}
                                            className={styles.input}
                                            required
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="password" className={styles.label}>Password (Login Santri)</label>
                                        <input
                                            type="text"
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            className={styles.input}
                                            placeholder="Otomatis dari tanggal lahir"
                                            readOnly
                                            style={{ backgroundColor: '#F3F4F6', cursor: 'not-allowed', fontFamily: 'monospace', letterSpacing: '2px' }}
                                        />
                                        <span className={styles.inputHint}>Format: DDMMYY (contoh: 050203)</span>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="kelas" className={styles.label}>Kelas <span className={styles.required}>*</span></label>
                                        <select
                                            id="kelas"
                                            name="kelas"
                                            value={formData.kelas}
                                            onChange={handleInputChange}
                                            className={styles.input}
                                            required
                                        >
                                            <option value="" disabled>Pilih Kelas</option>
                                            <option value="Ibtida'">Ibtida&apos;</option>
                                            <option value="Jurumiyah">Jurumiyah</option>
                                            <option value="Imrithi">Imrithi</option>
                                            <option value="Alfiyah 1">Alfiyah 1</option>
                                            <option value="Alfiyah 2">Alfiyah 2</option>
                                            <option value="Musyawirin">Musyawirin</option>
                                        </select>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="alamat" className={styles.label}>Alamat <span className={styles.required}>*</span></label>
                                        <input
                                            type="text"
                                            id="alamat"
                                            name="alamat"
                                            value={formData.alamat}
                                            onChange={handleInputChange}
                                            className={styles.input}
                                            placeholder="Masukkan alamat lengkap"
                                            required
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="namaWali" className={styles.label}>Nama Wali <span className={styles.required}>*</span></label>
                                        <input
                                            type="text"
                                            id="namaWali"
                                            name="namaWali"
                                            value={formData.namaWali}
                                            onChange={handleInputChange}
                                            className={styles.input}
                                            placeholder="Masukkan nama wali santri"
                                            required
                                        />
                                        <span className={styles.inputHint}>Username login wali santri</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>Batal</button>
                                <button type="submit" className={styles.btnSave}>Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./admin.module.css";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        if (confirm("Apakah Anda yakin ingin keluar?")) {
            router.push("/login");
        }
    };

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logoSection}>
                    <Image
                        src="/images/logo.png"
                        alt="Logo Pondok Pesantren"
                        width={48}
                        height={48}
                        className={styles.logoImage}
                        priority
                    />
                    <div className={styles.logoText}>
                        <div className={styles.logoName}>PP Inayatullah</div>
                        <div className={styles.logoSubtitle}>Portal Admin</div>
                    </div>
                </div>

                <nav className={styles.menuContainer}>
                    <div className={styles.menuSection}>
                        
                        <Link href="/admin/dashboard" className={`${styles.menuItem} ${pathname.includes('/dashboard') ? styles.menuItemActive : ''}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                            <span>Dashboard</span>
                        </Link>
                    </div>

                    <div className={styles.menuSection}>
                        
                        <Link href="/admin/santri" className={`${styles.menuItem} ${pathname.includes('/santri') ? styles.menuItemActive : ''}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                <line x1="12" y1="22.08" x2="12" y2="12"></line>
                            </svg>
                            <span>Data Santri</span>
                        </Link>
                    </div>

                    <div className={styles.menuSection}>
                       
                        <Link href="/admin/tagihan" className={`${styles.menuItem} ${pathname.includes('/tagihan') ? styles.menuItemActive : ''}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                            <span>Tagihan Keuangan</span>
                        </Link>
                    </div>

                    <div className={styles.menuSection}>
                        <Link href="/admin/laporan" className={`${styles.menuItem} ${pathname.includes('/laporan') ? styles.menuItemActive : ''}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            <span>Laporan Keuangan</span>
                        </Link>
                    </div>
                </nav>
            </aside>

            {/* Content Area */}
            <div className={styles.contentArea}>
                {/* Topbar */}
                <header className={styles.topbar}>
                    <div />

                    <div className={styles.userActions}>
                        <div className={styles.userProfile}>
                            <div className={styles.avatar}>
                                <Image
                                    src="/images/logo.png"
                                    alt="User"
                                    width={32}
                                    height={32}
                                    style={{ borderRadius: '50%' }}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Logout"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                backgroundColor: 'transparent',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                color: '#EF4444',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'all 0.2s',
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

                {/* Dynamic Page Content */}
                <main className={styles.main}>
                    {children}
                </main>
            </div>
        </div>
    );
}

"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    // Captcha state
    const [num1, setNum1] = useState(0);
    const [num2, setNum2] = useState(0);
    const [userCaptcha, setUserCaptcha] = useState("");
    const [isMounted, setIsMounted] = useState(false);

    // Error & UI states
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(false);

    const router = useRouter();

    const generateCaptcha = () => {
        setNum1(Math.floor(Math.random() * 20) + 1);
        setNum2(Math.floor(Math.random() * 20) + 1);
        setUserCaptcha("");
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        generateCaptcha();
        setIsMounted(true);
    }, []);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 600); // match animation duration
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");

        if (!username || !password) {
            setError("Username dan password tidak boleh kosong");
            triggerShake();
            return;
        }

        if (parseInt(userCaptcha) !== num1 + num2) {
            setError("Captcha salah");
            generateCaptcha();
            triggerShake();
            return;
        }

        setSuccessMsg("Login berhasil");
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const result = await response.json();

            if (!result.success) {
                setError(result.error || 'Login gagal');
                setSuccessMsg("");
                setLoading(false);
                triggerShake();
                return;
            }

            // Store user data based on role
            const { role, userId, redirectTo } = result.data;

            if (role === 'santri') {
                localStorage.setItem('user_santri_id', userId);
            } else if (role === 'wali') {
                localStorage.setItem('user_wali_santri_id', userId);
            }

            // Redirect to appropriate page
            setTimeout(() => {
                router.push(redirectTo);
            }, 800);

        } catch (err) {
            console.error(err);
            setError("Terjadi kesalahan koneksi.");
            setSuccessMsg("");
            setLoading(false);
            triggerShake();
        }
    };

    return (
        <div className={styles.container}>
            <div className={`${styles.card} ${shake ? styles.shake : ""}`}>
                <div className={styles.logoSection}>
                    <Image
                        src="/images/logo_inay.png"
                        alt="Logo Pondok Pesantren Inayatullah"
                        width={100}
                        height={100}
                        priority
                        className={styles.logo}
                    />
                    <h1 className={styles.title}>
                        Sistem Pembayaran
                        <br />
                        Pondok Pesantren Inayatullah
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.errorMessage}>{error}</div>}
                    {successMsg && <div className={styles.successMessage}>{successMsg}</div>}

                    {/* Username Field */}
                    <div className={styles.fieldGroup}>
                        <label htmlFor="username" className={styles.label}>Username</label>
                        <div className={styles.inputWrapper}>
                            <input
                                id="username"
                                type="text"
                                placeholder="Masukkan username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className={styles.input}
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div className={styles.fieldGroup}>
                        <label htmlFor="password" className={styles.label}>Password</label>
                        <div className={styles.inputWrapper}>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={styles.input}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Captcha Field */}
                    <div className={styles.fieldGroup}>
                        <label htmlFor="captcha" className={styles.label}>
                            Captcha: Berapa hasil dari {isMounted ? `${num1} + ${num2}` : '...'}?
                        </label>
                        <div className={styles.inputWrapper}>
                            <input
                                id="captcha"
                                type="number"
                                placeholder="Masukkan jawaban"
                                value={userCaptcha}
                                onChange={(e) => setUserCaptcha(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <button type="submit" className={styles.loginButton} disabled={loading}>
                        {loading ? "Memproses..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}

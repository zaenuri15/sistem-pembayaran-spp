import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { successResponse, errorResponse, validationError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        // Validation
        if (!username || !password) {
            return validationError('Username dan password harus diisi');
        }

        // 1. Check Admin Login
        const { data: adminData } = await supabaseServer
            .from('admin')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (adminData) {
            return successResponse({
                role: 'admin',
                userId: adminData.id,
                redirectTo: '/admin/dashboard',
                user: {
                    id: adminData.id,
                    username: adminData.username,
                }
            }, 'Login berhasil sebagai Admin');
        }

        // 2. Check Santri Login (NIS + Password)
        const { data: santriData, error: santriError } = await supabaseServer
            .from('santri')
            .select('id, nis, nama, kelas, password')
            .eq('nis', username)
            .eq('password', password)
            .maybeSingle();

        if (santriError) {
            console.error('[Login] Santri query error:', santriError.message);
        }

        if (santriData) {
            return successResponse({
                role: 'santri',
                userId: santriData.id,
                redirectTo: '/user',
                user: {
                    id: santriData.id,
                    nis: santriData.nis,
                    nama: santriData.nama,
                    kelas: santriData.kelas,
                }
            }, 'Login berhasil sebagai Santri');
        }

        // 3. Check Wali Login (Nama Wali + Password Santri)
        const { data: waliData, error: waliError } = await supabaseServer
            .from('santri')
            .select('id, nis, nama, nama_wali, password')
            .ilike('nama_wali', username)
            .eq('password', password)
            .maybeSingle();

        if (waliError) {
            console.error('[Login] Wali query error:', waliError.message);
        }

        if (waliData) {
            return successResponse({
                role: 'wali',
                userId: waliData.id,
                redirectTo: '/wali',
                user: {
                    id: waliData.id,
                    nama_wali: waliData.nama_wali,
                    santri_nama: waliData.nama,
                    santri_nis: waliData.nis,
                }
            }, 'Login berhasil sebagai Wali Santri');
        }

        // If all checks fail
        return errorResponse('Username atau password salah', 401);

    } catch (error: any) {
        console.error('Login error:', error);
        return errorResponse('Terjadi kesalahan saat login', 500);
    }
}

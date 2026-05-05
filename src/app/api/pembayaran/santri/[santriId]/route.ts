import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { successResponse, errorResponse, notFoundError } from '@/lib/api-response';

/**
 * GET /api/pembayaran/santri/[santriId]
 * Get payment history for a specific student with full details
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ santriId: string }> }
) {
    try {
        const { santriId } = await params;

        // Parse ke integer karena kolom 'id' di tabel santri bertipe integer
        const santriIdInt = parseInt(santriId, 10);
        if (isNaN(santriIdInt)) {
            return notFoundError('ID Santri tidak valid');
        }

        // Verify santri exists
        const { data: santri, error: santriError } = await supabaseServer
            .from('santri')
            .select('id, nis, nama, kelas, jenis_kelamin, tanggal_lahir, alamat, email, nama_wali')
            .eq('id', santriIdInt)
            .maybeSingle();

        if (santriError || !santri) {
            return notFoundError('Santri tidak ditemukan');
        }

        // Get all pembayaran records with full details
        const { data: payments, error: paymentsError } = await supabaseServer
            .from('pembayaran')
            .select(`
                id,
                total_tagihan,
                dibayarkan,
                created_at,
                tagihan_batch (
                    id,
                    bulan,
                    tahun,
                    spp,
                    kebersihan,
                    konsumsi,
                    pembangunan,
                    total
                )
            `)
            .eq('santri_id', santriIdInt);

        if (paymentsError) {
            console.error('Error fetching payments:', paymentsError.message);
            return errorResponse(`Gagal mengambil data pembayaran: ${paymentsError.message}`, 500);
        }

        return successResponse({
            santri,
            payments: payments || [],
        });
    } catch (error: any) {
        console.error('Pembayaran santri GET error:', error);
        return errorResponse('Terjadi kesalahan server', 500);
    }
}

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { successResponse, errorResponse, validationError } from '@/lib/api-response';

/**
 * POST /api/tagihan/batch
 * Create a new billing batch and auto-generate pembayaran records for all santri
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { bulan, tahun, spp, kebersihan, konsumsi, pembangunan } = body;

        // Validation
        if (!bulan || !tahun) {
            return validationError('Bulan dan tahun harus diisi');
        }

        if (bulan < 1 || bulan > 12) {
            return validationError('Bulan harus antara 1-12');
        }

        // Parse amounts (default to 0 if not provided)
        const sppAmount = parseFloat(spp) || 0;
        const kebersihanAmount = parseFloat(kebersihan) || 0;
        const konsumsiAmount = parseFloat(konsumsi) || 0;
        const pembangunanAmount = parseFloat(pembangunan) || 0;
        const totalAmount = sppAmount + kebersihanAmount + konsumsiAmount + pembangunanAmount;

        // Check if batch already exists for this month/year
        const { data: existing } = await supabaseServer
            .from('tagihan_batch')
            .select('id')
            .eq('bulan', parseInt(bulan))
            .eq('tahun', parseInt(tahun))
            .single();

        if (existing) {
            return errorResponse(
                `Tagihan untuk bulan ${bulan} tahun ${tahun} sudah ada`,
                409
            );
        }

        // Insert new batch
        const { data: batchData, error: batchError } = await supabaseServer
            .from('tagihan_batch')
            .insert([{
                bulan: parseInt(bulan),
                tahun: parseInt(tahun),
                spp: sppAmount,
                kebersihan: kebersihanAmount,
                konsumsi: konsumsiAmount,
                pembangunan: pembangunanAmount,
            }])
            .select()
            .single();

        if (batchError || !batchData) {
            console.error('Error creating batch:', batchError);
            return errorResponse(`Gagal membuat batch tagihan: ${batchError?.message || 'Unknown Error'}`, 500);
        }

        // Get all active santri
        const { data: santriList, error: santriError } = await supabaseServer
            .from('santri')
            .select('id');

        if (santriError) {
            console.error('Error fetching santri:', santriError);
            return errorResponse('Gagal mengambil data santri', 500);
        }

        // Generate pembayaran records for all santri
        if (santriList && santriList.length > 0) {
            const pembayaranPayload = santriList.map((santri: { id: number }) => ({
                santri_id: santri.id,
                tagihan_batch_id: batchData.id,
                total_tagihan: totalAmount,
                dibayarkan: 0,
            }));

            const { error: paymentError } = await supabaseServer
                .from('pembayaran')
                .insert(pembayaranPayload);

            if (paymentError) {
                console.error('Error creating pembayaran:', paymentError);
                // Note: Batch is already created, but pembayaran failed
                return errorResponse(
                    'Batch tagihan berhasil dibuat, tetapi gagal membuat record pembayaran',
                    500
                );
            }
        }

        return successResponse(
            {
                batch: batchData,
                santriCount: santriList?.length || 0,
            },
            `Tagihan berhasil dibuat untuk ${santriList?.length || 0} santri`,
            201
        );
    } catch (error: any) {
        console.error('Tagihan batch POST error:', error);
        return errorResponse('Terjadi kesalahan server', 500);
    }
}

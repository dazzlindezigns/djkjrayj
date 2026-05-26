import { supabase } from '../supabase';

export async function sendEmail(
  type: string,
  bookingId: string,
  attachmentBase64?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      type,
      booking_id: bookingId,
      ...(attachmentBase64 ? { attachment_base64: attachmentBase64 } : {}),
    },
  });

  if (error) {
    console.error('sendEmail error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, ...data };
}

export async function generateContract(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('generate-contract', {
    body: { booking_id: bookingId },
  });

  if (error) {
    console.error('generateContract error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, ...data };
}

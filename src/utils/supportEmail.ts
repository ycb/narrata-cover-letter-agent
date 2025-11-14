import { supabase } from '@/lib/supabase';

interface SendSupportEmailOptions {
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

interface SendSupportEmailResult {
  success: boolean;
  fallback?: boolean;
  error?: string;
}

/**
 * Send a support email through Supabase Edge Function fallback to mailto link
 */
export async function sendSupportEmail({
  subject,
  body,
  metadata,
  tags,
}: SendSupportEmailOptions): Promise<SendSupportEmailResult> {
  if (!subject || !body) {
    return {
      success: false,
      error: 'Subject and body are required to send a support email.',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-support-email', {
      body: {
        subject,
        body,
        metadata,
        tags,
      },
    });

    if (error) {
      throw error;
    }

    if (data?.success === true) {
      return { success: true };
    }
  } catch (error) {
    console.error('[SupportEmail] Failed to send via Supabase function:', error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Support service unavailable. Please try again or email support@narrata.co directly.',
    };
  }

  return { success: true };
}



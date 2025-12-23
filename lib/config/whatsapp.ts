/**
 * WhatsApp Business configuration for Moverz
 */

// Format: E.164 (remove spaces, keep +)
export const MOVERZ_WHATSAPP_NUMBER = '33633046059'; // +33 6 33 04 60 59

/**
 * Generate a unique linking token for lead identification
 * Format: MZ-XXXXXX (6 alphanumeric chars, excluding confusing characters)
 */
export function generateLinkingToken(): string {
  // Exclude I, O, 0, 1 to avoid confusion
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'MZ-';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Build WhatsApp deep link with pre-filled message
 */
export function buildWhatsAppDeepLink(linkingToken: string): string {
  const message = `Bonjour,\n\nJe veux compléter mon inventaire avec des photos.\n\nMon code dossier : ${linkingToken}`;
  return `https://wa.me/${MOVERZ_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}


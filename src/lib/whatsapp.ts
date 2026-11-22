import React from 'react';

/**
 * WhatsApp integration utilities for real estate lead communication.
 */

/**
 * Formats a phone number for WhatsApp wa.me links:
 * 1. Remove all spaces, dashes, and brackets.
 * 2. If it starts with '0', replace it with '92' (for Pakistan).
 * 3. If it doesn't start with '+', prepend '+'.
 */
export function formatWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  // Remove all spaces, dashes, and brackets
  let cleaned = phone.replace(/[\s\-()[\]{}]/g, '');
  if (!cleaned) return '';

  // If it starts with '0', replace it with '92' (for Pakistan)
  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.slice(1);
  }

  // If it doesn't start with '+', prepend '+'
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Generates the standardized inquiry greeting message:
 * "Hi ${lead.name}, this is ${currentUser.full_name || 'your agent'} from the brokerage regarding your property inquiry. How can I assist you today?"
 */
export function getWhatsAppMessage(leadName: string, agentName?: string | null): string {
  const sender = (agentName && agentName.trim()) || 'your agent';
  return `Hi ${leadName || 'there'}, this is ${sender} from the brokerage regarding your property inquiry. How can I assist you today?`;
}

/**
 * Constructs the full wa.me direct messaging URL.
 */
export function getWhatsAppUrl(
  phone?: string | null,
  leadName: string = '',
  agentName?: string | null
): string | null {
  if (!phone) return null;
  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone) return null;
  const message = getWhatsAppMessage(leadName, agentName);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Safely opens WhatsApp direct chat in a new tab.
 */
export function openWhatsAppChat(
  phone?: string | null,
  leadName: string = '',
  agentName?: string | null
): boolean {
  const url = getWhatsAppUrl(phone, leadName, agentName);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Official WhatsApp SVG icon component.
 */
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) =>
  React.createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '24',
      height: '24',
      stroke: 'none',
      fill: 'currentColor',
      className,
      'aria-hidden': 'true',
    },
    React.createElement('path', {
      d: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
    })
  );

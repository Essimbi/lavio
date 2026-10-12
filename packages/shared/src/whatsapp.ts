/** Liens WhatsApp (docs/06, docs/07). Le numéro vient toujours de la configuration. */

/** Garde uniquement les chiffres ; ajoute l'indicatif 237 aux numéros camerounais à 9 chiffres. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('6')) return `237${digits}`;
  if (digits.startsWith('00')) return digits.slice(2);
  return digits;
}

/** Remplace les variables `{nom}` d'un modèle de message. Les variables inconnues sont laissées. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

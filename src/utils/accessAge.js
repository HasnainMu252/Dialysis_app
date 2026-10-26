/**
 * Human-readable age of a vascular access from its placement date.
 * Falls back to a manually entered ageText, then to a dash.
 */
export function accessAge(placementDate, ageText = '') {
  if (placementDate) {
    const d = new Date(placementDate);
    if (!Number.isNaN(d.getTime())) {
      const months = Math.max(
        0,
        Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.4375))
      );
      const years = Math.floor(months / 12);
      const rem = months % 12;
      if (years > 0) return rem ? `${years}y ${rem}m` : `${years}y`;
      return `${months}m`;
    }
  }
  return ageText || '—';
}

/** YYYY-MM-DD for <input type="date"> binding. */
export function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

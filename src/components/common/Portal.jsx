import { createPortal } from 'react-dom';

/**
 * Renders children into document.body.
 *
 * WHY: our `.card` utility uses `backdrop-blur` (backdrop-filter). Per the CSS
 * spec, any element with a filter/backdrop-filter becomes the containing block
 * for `position: fixed` descendants. A modal rendered *inside* a card therefore
 * gets trapped within the card instead of covering the viewport (it appears
 * mis-positioned / overlapping). Portaling the modal to <body> escapes that
 * containing block so `fixed inset-0` covers the whole screen as intended.
 */
export default function Portal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

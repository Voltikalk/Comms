import React from 'react';

/**
 * Telegram bubble appendix. Rendered only on the last bubble of a cluster;
 * colour comes from `.tg-tail-self` / `.tg-tail-peer` (telegram-tokens.css),
 * so it always matches the bubble fill in light and dark themes.
 */
export const BubbleTail: React.FC<{ isSelf: boolean }> = ({ isSelf }) => (
  <svg
    className={`tg-tail ${isSelf ? 'tg-tail-self' : 'tg-tail-peer'}`}
    width="7"
    height="17"
    viewBox="0 0 7 17"
    aria-hidden
    focusable="false"
  >
    <path d="M6 17H0V0c.193 2.84.876 5.767 2.05 8.782.904 2.325 2.446 4.485 4.625 6.48A1 1 0 016 17z" fill="currentColor" />
  </svg>
);

export default BubbleTail;

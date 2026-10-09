import React from 'react';
import { splitHighlight, type MatchRange } from '../../../lib/chat-search';

/** Query matches inside a string, as accent-coloured text. */
export const SearchHighlight: React.FC<{ text: string; ranges: readonly MatchRange[] }> = ({ text, ranges }) => (
  <>
    {splitHighlight(text, ranges).map((p, i) =>
      p.hit ? (
        <mark key={i} className="rounded-[3px] bg-accent/15 px-px text-accent">
          {p.text}
        </mark>
      ) : (
        <React.Fragment key={i}>{p.text}</React.Fragment>
      )
    )}
  </>
);

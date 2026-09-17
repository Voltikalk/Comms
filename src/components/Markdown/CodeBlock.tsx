import React, { useState } from 'react';
import { IconCheck, IconCopy, IconCode } from '@tabler/icons-react';

export interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div
      className="my-2 rounded-xl overflow-hidden bg-[#181e29] border border-white/10 shadow-lg text-slate-100 text-xs font-mono select-text"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#121620] border-b border-white/5 select-none">
        <div className="flex items-center gap-1.5 text-slate-400">
          <IconCode size={15} className="text-[#3390ec]" />
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-300">
            {language || 'code'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 hover:text-white transition-all cursor-pointer text-[11px] font-medium"
          title="Скопировать код"
        >
          {copied ? (
            <>
              <IconCheck size={13} className="text-emerald-400" />
              <span className="text-emerald-400">Скопировано!</span>
            </>
          ) : (
            <>
              <IconCopy size={13} />
              <span>Копировать</span>
            </>
          )}
        </button>
      </div>

      {/* Code body with line numbers */}
      <div className="p-3 overflow-x-auto tg-scrollbar flex text-[13px] leading-relaxed">
        {lines.length > 1 && (
          <div className="select-none pr-3 mr-3 border-r border-white/5 text-slate-600 text-right font-mono text-xs">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        )}
        <pre className="flex-1 font-mono m-0 p-0 whitespace-pre overflow-x-auto text-slate-200">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

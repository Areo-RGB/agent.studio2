/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language?: string;
  maxHeight?: string;
  showLineNumbers?: boolean;
  filename?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  language = 'text',
  maxHeight = '400px',
  showLineNumbers = true,
  filename,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const lines = code.split('\n');

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 overflow-hidden text-xs font-mono">
      {filename && (
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-neutral-800/80 bg-neutral-900/60 text-neutral-400">
          <span className="font-sans font-medium text-xs text-neutral-300">{filename}</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-500 uppercase">{language}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-300 hover:text-white transition-colors"
              title="Copy code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {!filename && (
        <div className="flex justify-end p-2 bg-neutral-900/40 border-b border-neutral-800/40">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-300 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      <div
        className="overflow-auto p-3 text-neutral-300 leading-relaxed font-mono"
        style={{ maxHeight }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-neutral-900/50">
                {showLineNumbers && (
                  <td className="pr-4 select-none text-right text-neutral-600 font-mono text-[11px] w-8 align-top">
                    {idx + 1}
                  </td>
                )}
                <td className="whitespace-pre break-all font-mono align-top text-neutral-300">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

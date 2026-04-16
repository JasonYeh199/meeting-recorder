'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Copy, Check, ChevronDown } from 'lucide-react';
import type { FullAnalysis } from '@/lib/analysis-types';

const TYPE_LABELS: Record<string, string> = {
  broker_seminar: '券商座談',
  company_visit: '拜訪公司',
  earnings_call: '法說會',
  other: '其他',
};

function buildMarkdown(
  meeting: { title: string; company: string; type: string; recordedAt: string },
  analysis: { quickSummary?: string; executiveSummary?: string; financialData?: FullAnalysis['financialData']; sentimentAnalysis?: FullAnalysis['sentimentAnalysis']; qaHighlights?: FullAnalysis['qaHighlights']; followUpItems?: FullAnalysis['followUpItems'] },
  transcript?: { fullText?: string }
): string {
  const date = new Date(meeting.recordedAt).toLocaleDateString('zh-TW');
  const lines: string[] = [];

  lines.push(`# ${meeting.title}`);
  lines.push(`**公司：** ${meeting.company} ｜ **類型：** ${TYPE_LABELS[meeting.type] ?? meeting.type} ｜ **日期：** ${date}`);
  lines.push('');

  if (analysis.quickSummary) {
    lines.push('## 快速摘要');
    lines.push(analysis.quickSummary);
    lines.push('');
  }

  if (analysis.executiveSummary) {
    lines.push('## 完整摘要');
    lines.push(analysis.executiveSummary);
    lines.push('');
  }

  if (analysis.financialData?.length) {
    lines.push('## 財務數據');
    lines.push('| 指標 | 數值 | 變化 |');
    lines.push('|------|------|------|');
    for (const fd of analysis.financialData) {
      lines.push(`| ${fd.metric} | ${fd.value} | ${fd.change ?? '-'} |`);
    }
    lines.push('');
  }

  if (analysis.sentimentAnalysis?.length) {
    lines.push('## 管理層態度');
    for (const s of analysis.sentimentAnalysis) {
      const sentMap: Record<string, string> = { positive: '正面', cautious: '謹慎', neutral: '中立', evasive: '迴避', negative: '負面' };
      lines.push(`- **${s.topic}** [${sentMap[s.sentiment] ?? s.sentiment}]：「${s.evidence}」`);
    }
    lines.push('');
  }

  if (analysis.qaHighlights?.length) {
    lines.push('## 重要 Q&A');
    for (const qa of analysis.qaHighlights) {
      lines.push(`**Q：** ${qa.question}`);
      lines.push(`**A：** ${qa.answer}`);
      lines.push('');
    }
  }

  if (analysis.followUpItems?.length) {
    lines.push('## 後續追蹤');
    for (const fu of analysis.followUpItems) {
      lines.push(`- [ ] ${fu.item}${fu.deadline ? `（${fu.deadline}）` : ''} [需研究員確認]`);
    }
    lines.push('');
  }

  if (transcript?.fullText) {
    lines.push('---');
    lines.push('## 逐字稿全文');
    lines.push(transcript.fullText);
    lines.push('');
  }

  lines.push('---');
  lines.push('*AI 分析由 Claude 生成，僅供參考，投資決策請研究員自行判斷*');

  return lines.join('\n');
}

interface Props {
  meeting: { title: string; company: string; type: string; recordedAt: string };
  analysis: { quickSummary?: string; executiveSummary?: string; financialData?: FullAnalysis['financialData']; sentimentAnalysis?: FullAnalysis['sentimentAnalysis']; qaHighlights?: FullAnalysis['qaHighlights']; followUpItems?: FullAnalysis['followUpItems'] };
  transcript?: { fullText?: string };
}

export function ExportMenu({ meeting, analysis, transcript }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const copyMarkdown = async () => {
    const md = buildMarkdown(meeting, analysis, transcript);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const md = buildMarkdown(meeting, analysis, transcript);
    const blob = new Blob([md], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.company}_${meeting.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Download className="w-4 h-4" />}
        匯出
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-20 min-w-[180px]">
          <button
            onClick={copyMarkdown}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Copy className="w-4 h-4 text-gray-400" />
            複製為 Markdown
          </button>
          <button
            onClick={downloadTxt}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
          >
            <Download className="w-4 h-4 text-gray-400" />
            下載為 .txt
          </button>
        </div>
      )}
    </div>
  );
}

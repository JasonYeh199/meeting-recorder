'use client';

import { useEffect, useState } from 'react';
import type { MeetingMeta, MeetingType } from '@/hooks/useChunkedUpload';

const TYPE_OPTIONS: { value: MeetingType; label: string }[] = [
  { value: 'broker_seminar', label: '券商座談' },
  { value: 'company_visit', label: '拜訪公司' },
  { value: 'earnings_call', label: '法說會' },
  { value: 'other', label: '其他' },
];

interface Props {
  initialDate?: Date;
  onSubmit: (meta: MeetingMeta) => void;
  submitting?: boolean;
}

export function MeetingMetaForm({ initialDate, onSubmit, submitting }: Props) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState<MeetingType>('other');
  const [recordedAt, setRecordedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<string[]>([]);

  // Set initial date from file lastModified
  useEffect(() => {
    const d = initialDate ?? new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setRecordedAt(`${yyyy}-${mm}-${dd}`);
  }, [initialDate]);

  // Load company suggestions from history
  useEffect(() => {
    fetch('/api/meetings')
      .then((r) => r.json())
      .then((data: { company?: string }[]) => {
        const unique = [...new Set(data.map((m) => m.company).filter(Boolean))] as string[];
        setCompanies(unique.slice(0, 30));
      })
      .catch(() => {});
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = '請輸入會議標題';
    if (!company.trim()) errs.company = '請輸入公司名稱';
    if (!recordedAt) errs.recordedAt = '請選擇會議日期';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      title: title.trim(),
      company: company.trim(),
      type,
      recordedAt: new Date(recordedAt),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          會議標題 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="台積電 2025Q2 法說會"
          className={[
            'w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300',
            errors.title ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50',
          ].join(' ')}
        />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
      </div>

      {/* Company */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          公司名稱 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          list="companies-list"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="台積電"
          className={[
            'w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300',
            errors.company ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50',
          ].join(' ')}
        />
        {companies.length > 0 && (
          <datalist id="companies-list">
            {companies.map((c) => <option key={c} value={c} />)}
          </datalist>
        )}
        {errors.company && <p className="text-xs text-red-500 mt-1">{errors.company}</p>}
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          會議類型 <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={[
                'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                type === opt.value
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          會議日期 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
          className={[
            'w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300',
            errors.recordedAt ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50',
          ].join(' ')}
        />
        {errors.recordedAt && <p className="text-xs text-red-500 mt-1">{errors.recordedAt}</p>}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">備註（選填）</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="其他補充說明…"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
      >
        {submitting ? '準備上傳…' : '開始分析'}
      </button>
    </form>
  );
}

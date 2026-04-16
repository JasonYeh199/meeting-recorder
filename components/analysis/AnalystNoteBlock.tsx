'use client';

import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';

interface Note {
  id: string;
  content: string;
  createdAt: string;
  anchorType: string;
}

interface Props {
  meetingId: string;
  notes: Note[];
  onAdd: (content: string) => Promise<void>;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function AnalystNoteBlock({ meetingId: _meetingId, notes, onAdd, onUpdate, onDelete }: Props) {
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!newContent.trim() || submitting) return;
    setSubmitting(true);
    await onAdd(newContent.trim());
    setNewContent('');
    setSubmitting(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    await onUpdate(id, editContent.trim());
    setEditingId(null);
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  return (
    <div className="space-y-3">
      {/* Existing notes */}
      {notes.map((note) => (
        <div key={note.id} className="relative border-l-4 border-orange-400 bg-orange-50/40 rounded-r-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-orange-600">✏️ 研究員筆記</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => startEdit(note)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/60"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white/60"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {editingId === note.id ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full text-sm border border-orange-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate(note.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg"
                >
                  <Check className="w-3.5 h-3.5" /> 儲存
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg"
                >
                  <X className="w-3.5 h-3.5" /> 取消
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{note.content}</p>
          )}
        </div>
      ))}

      {/* Add new note */}
      <div className="border border-dashed border-orange-300 rounded-xl p-3 space-y-2">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="新增研究員筆記…"
          rows={3}
          className="w-full text-sm border-0 bg-transparent focus:outline-none resize-none text-gray-700 placeholder:text-gray-400"
        />
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            disabled={!newContent.trim() || submitting}
            className="px-4 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg disabled:opacity-40"
          >
            新增筆記
          </button>
        </div>
      </div>
    </div>
  );
}

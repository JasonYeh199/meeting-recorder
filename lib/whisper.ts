import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error('OPENAI_API_KEY 未設定');
  return new OpenAI({ apiKey: key });
}

export interface TranscriptSegment {
  start: number;
  end: number;
  speaker?: string;
  text: string;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  fullText: string;
  language: string;
}

const MAX_BYTES = 24 * 1024 * 1024; // 24 MB (Whisper limit is 25 MB)

export async function transcribeAudio(audioPath: string): Promise<TranscriptResult> {
  const stats = fs.statSync(audioPath);

  if (stats.size <= MAX_BYTES) {
    return transcribeFile(audioPath);
  }

  // File too large — split into chunks and merge
  return transcribeLargeFile(audioPath, stats.size);
}

async function transcribeFile(audioPath: string): Promise<TranscriptResult> {
  const response = await getOpenAI().audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: 'whisper-1',
    language: 'zh',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  const segments: TranscriptSegment[] = (response.segments ?? []).map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }));

  return {
    segments,
    fullText: response.text ?? '',
    language: response.language ?? 'zh',
  };
}

async function transcribeLargeFile(audioPath: string, totalSize: number): Promise<TranscriptResult> {
  // Read entire file, split into MAX_BYTES chunks, write temp files, transcribe each
  const buffer = fs.readFileSync(audioPath);
  const ext = path.extname(audioPath);
  const tmpDir = path.dirname(audioPath);

  const chunkPaths: string[] = [];
  let offset = 0;
  let chunkIndex = 0;

  while (offset < totalSize) {
    const chunkBuffer = buffer.subarray(offset, offset + MAX_BYTES);
    const chunkPath = path.join(tmpDir, `chunk_${chunkIndex}${ext}`);
    fs.writeFileSync(chunkPath, chunkBuffer);
    chunkPaths.push(chunkPath);
    offset += MAX_BYTES;
    chunkIndex++;
  }

  const allSegments: TranscriptSegment[] = [];
  let allText = '';
  let language = 'zh';
  let timeOffset = 0;

  for (const chunkPath of chunkPaths) {
    const result = await transcribeFile(chunkPath);
    language = result.language;

    for (const seg of result.segments) {
      allSegments.push({ ...seg, start: seg.start + timeOffset, end: seg.end + timeOffset });
    }

    allText += (allText ? '\n' : '') + result.fullText;
    if (result.segments.length > 0) {
      timeOffset = allSegments[allSegments.length - 1].end;
    }

    fs.unlinkSync(chunkPath);
  }

  return { segments: allSegments, fullText: allText, language };
}

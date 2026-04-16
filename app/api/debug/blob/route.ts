// Temporary debug endpoint — remove after confirming Blob works
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return Response.json({ ok: false, error: 'BLOB_READ_WRITE_TOKEN not set' });
  }

  try {
    const { put, del } = await import('@vercel/blob');
    const testKey = `debug/test_${Date.now()}.txt`;
    const result = await put(testKey, Buffer.from('hello'), {
      access: 'private',
      contentType: 'text/plain',
    });
    await del(result.url);
    return Response.json({ ok: true, url: result.url, tokenPrefix: token.slice(0, 20) });
  } catch (err) {
    return Response.json({ ok: false, error: String(err), tokenPrefix: token.slice(0, 20) });
  }
}

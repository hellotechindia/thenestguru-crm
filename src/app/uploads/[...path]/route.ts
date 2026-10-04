import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const base = path.join(process.cwd(), 'public', 'uploads');
  const filePath = path.join(base, ...params.path);

  // path traversal se bachne ke liye
  if (!filePath.startsWith(base + path.sep)) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const data = await fs.readFile(filePath);
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    return new NextResponse(data, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'staff-docs');

    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    // Handle multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const category = (formData.get('category') as string) || 'doc';

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
      }

      // Check file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: 'File size exceeds 20MB limit' }, { status: 400 });
      }

      const originalName = file.name || 'document';
      const ext = path.extname(originalName).toLowerCase() || '.png';
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

      if (!allowedExts.includes(ext)) {
        return NextResponse.json(
          { success: false, error: 'Invalid file format. Only JPG, PNG, WEBP, and PDF files are allowed.' },
          { status: 400 }
        );
      }

      // Safe clean filename
      const cleanBase = path
        .basename(originalName, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 30);
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const fileName = `${category}_${cleanBase}_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadsDir, fileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      const publicUrl = `/uploads/staff-docs/${fileName}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        fileName: file.name,
        size: file.size,
      });
    }

    // Handle Base64 JSON fallback
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { base64, filename = 'document', category = 'doc' } = body;

      if (!base64 || typeof base64 !== 'string') {
        return NextResponse.json({ success: false, error: 'No base64 data provided' }, { status: 400 });
      }

      // Parse data URL: data:image/png;base64,.... or data:application/pdf;base64,....
      const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let ext = '.png';

      if (matches && matches.length === 3) {
        const mime = matches[1];
        if (mime.includes('pdf')) ext = '.pdf';
        else if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
        else if (mime.includes('webp')) ext = '.webp';
        else if (mime.includes('png')) ext = '.png';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(base64, 'base64');
      }

      if (buffer.length > 20 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: 'File size exceeds 20MB limit' }, { status: 400 });
      }

      const cleanBase = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const fileName = `${category}_${cleanBase}_${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadsDir, fileName);

      await fs.writeFile(filePath, buffer);

      const publicUrl = `/uploads/staff-docs/${fileName}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        fileName,
        size: buffer.length,
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported Content-Type' }, { status: 400 });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error occurred during upload' },
      { status: 500 }
    );
  }
}

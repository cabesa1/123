import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/db';

export const runtime = 'nodejs';

type SavedRequest = { key?: unknown; brand?: unknown; trend?: unknown };

export async function GET() {
  try {
    const result = await database.query('SELECT key, brand, payload, created_at FROM saved_trends ORDER BY created_at DESC');
    return NextResponse.json({ items: result.rows });
  } catch (error) {
    console.error('Unable to read saved trends', error);
    return NextResponse.json({ error: 'DATABASE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SavedRequest;
    if (typeof body.key !== 'string' || typeof body.brand !== 'string' || !body.trend || typeof body.trend !== 'object') {
      return NextResponse.json({ error: 'INVALID_SAVED_TREND' }, { status: 400 });
    }
    await database.query(
      `INSERT INTO saved_trends (key, brand, payload)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (key) DO UPDATE SET brand = EXCLUDED.brand, payload = EXCLUDED.payload, updated_at = NOW()`,
      [body.key, body.brand, JSON.stringify(body.trend)],
    );
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('Unable to save trend', error);
    return NextResponse.json({ error: 'DATABASE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json() as SavedRequest;
    if (typeof body.key !== 'string') return NextResponse.json({ error: 'INVALID_SAVED_TREND' }, { status: 400 });
    await database.query('DELETE FROM saved_trends WHERE key = $1', [body.key]);
    return NextResponse.json({ saved: false });
  } catch (error) {
    console.error('Unable to remove saved trend', error);
    return NextResponse.json({ error: 'DATABASE_UNAVAILABLE' }, { status: 503 });
  }
}

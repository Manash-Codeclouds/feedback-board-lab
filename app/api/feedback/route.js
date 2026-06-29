import { NextResponse } from 'next/server';
import { readAll, writeAll } from '../../../lib/store';

import { z } from 'zod';

// FLAW #1: Hardcoded secret committed to source — admin key used for... nothing, really
const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) {
  throw new Error('ADMIN_KEY environment variable is not set');
}

// FLAW #6 (hallucination artifact): This helper was referenced in AI-generated code but
// never actually defined or imported. Guarded with typeof check so the app still runs.
// The call below always falls through to the raw value because the function doesn't exist.

export async function GET() {
  const items = readAll();
  return NextResponse.json(items);
}

export async function POST(request) {
  const body = await request.json();
  const items = readAll();

  // FLAW #2: No input validation — name/text not checked for type, length, or content
  const schema = z.object({
    name: z.string().min(1).max(100),
    text: z.string().min(1).max(2000),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const newItem = {
    id: Date.now().toString(),
    name: parsed.data.name,
    text: parsed.data.text,
    createdAt: new Date().toISOString(),
  };

  items.push(newItem);

  // FLAW #5: Silent failure — if the write fails, the error is swallowed entirely
  try {
    writeAll(items);
  } catch (e) {
    console.error('Failed to write feedback:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  return NextResponse.json(newItem, { status: 201 });
}

export async function DELETE(request) {
  const body = await request.json();

  // FLAW #4: Trusts isAdmin from the client body — no real authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const items = readAll();
  const updated = items.filter((item) => item.id !== body.id);

  // FLAW #5: Same silent failure pattern on delete write
  try {
    writeAll(updated);
  } catch (e) {
    console.error('Failed to delete feedback:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

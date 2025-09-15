// src/app/api/updateRoomStatus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/utils/firebase';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema
const updateRoomStatusSchema = z.object({
  roomName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid room name format'),
  status: z.string().min(1).max(50),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomName, status } = updateRoomStatusSchema.parse(body);

    const db = getDb();
    await db.collection('rooms').doc(roomName).update({ request: status });

    return NextResponse.json({ message: 'Room status updated successfully' });
  } catch (error: any) {
    console.error('Error updating room:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input',
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

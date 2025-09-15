import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { getDb } from '@/utils/firebase';
import { RequestEnum } from '@/utils/requestEnum';
import { z } from 'zod';

// Validation schema
const createTokenSchema = z.object({
  participantName: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid participant name format'),
  roomName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid room name format'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate inputs
    const { participantName, roomName } = createTokenSchema.parse(body);
    
    const apiKey = process.env.NEXT_PUBLIC_LIVEKIT_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Missing LIVEKIT credentials' }, { status: 500 });
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: '10m',
    });

    token.addGrant({ roomJoin: true, room: roomName });

    const jwt = await token.toJwt();

    try {
      const db = getDb();
      const docRef = db.collection("rooms").doc(roomName);
      
      await docRef.set({
        userId: participantName,
        roomName,
        request: RequestEnum.START,
      });
      
      console.log(`Successfully set document for room: ${roomName}`);
    } catch (firestoreError) {
      console.error('Firestore error details:', firestoreError);
    }
    
    return NextResponse.json({ token: jwt });
  } catch (error) {
    console.error('Token creation error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input',
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create token',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
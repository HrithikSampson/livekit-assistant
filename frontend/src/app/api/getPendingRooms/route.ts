import { NextResponse } from 'next/server';
import { getDb } from '@/utils/firebase';
import { RequestEnum } from '@/utils/requestEnum';

export async function GET() {
  try {
    
    const apiKey = process.env.NEXT_PUBLIC_LIVEKIT_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Missing LIVEKIT credentials' }, { status: 500 });
    }

    try {
      const db = getDb();
      const docRef = await db.collection('rooms')
        .where('request', '==', RequestEnum.PENDING)
        .get();
  
      
      if (docRef.empty) {
        console.log('No pending rooms found');
        return NextResponse.json([]);
      }
    
      const rooms = docRef.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`Number of Pending Rooms: ${rooms.length}`)
      return NextResponse.json({rooms});
      
    } catch (firestoreError) {
      console.error('Firestore error details:', firestoreError);
    }
    
    return NextResponse.json([]);
  } catch (error) {
    console.error('Token creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create token',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
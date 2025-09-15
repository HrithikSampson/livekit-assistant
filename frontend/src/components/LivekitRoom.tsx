"use client";
import {
  RoomContext,
} from '@livekit/components-react';

import { useEffect, useState } from 'react';
import { Room } from 'livekit-client';
import '@livekit/components-styles';
import { v4 as uuidv4 } from 'uuid';
import LiveAudio from './LiveAudio';
  
const serverUrl = 'wss://call-gpt-g9awkea8.livekit.cloud';


// function MyVideoConference() {
//   // `useTracks` returns all camera and screen share tracks. If a user
//   // joins without a published camera track, a placeholder track is returned.
//   const tracks = useTracks(
//     [
//       { source: Track.Source.Microphone, withPlaceholder: true },
//     ],
//     { onlySubscribed: false },
//   );
//   const trackRef = useEnsureTrackRef();
//   return (
//     <GridLayout tracks={tracks}>
//       {/* The GridLayout accepts zero or one child. The child is used
//         as a template to render all passed in tracks. */}
//       <ParticipantTile>
//         <AudioTrack trackRef={trackRef} />
//       </ParticipantTile>
//     </GridLayout>
//   );
// }
export default function LivekitRoom({roomName}: {roomName?: string}) {
  const [room] = useState(() => {
    return new Room({
      adaptiveStream: true,
      dynacast: true,
    })
  });
  
  useEffect(() => {
    let mounted = true;
    if(!roomName) {
      roomName = uuidv4();
    }
    const token = async () => {
      if(localStorage.getItem("call_gpt_token")) {
        return localStorage.getItem("call_gpt_token");
      }
      const response = await fetch('/api/createToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantName: `${roomName}-user`,
          roomName: roomName,
        }),
      });
      const data = await response.json();
      return data.token;
    };
    const connect = async () => {
      if (mounted) {
        await room.connect(serverUrl, await token());
        console.log("Connected to room", roomName);
      }
    };
    connect();
  
    return () => {
      mounted = false;
      room.disconnect();
    };
  }, [room]);
  
  return (
    <RoomContext.Provider value={room}>
      <LiveAudio room={room} />
    </RoomContext.Provider>
  );
}

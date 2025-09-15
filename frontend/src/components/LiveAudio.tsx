"use client";
import {
  ControlBar,
  RoomAudioRenderer,
  useTracks,
  useTrackVolume,
} from '@livekit/components-react';
import { twMerge } from "tailwind-merge";

import { motion } from 'framer-motion';
import { useState } from 'react';
import { AudioWaveform, Bot } from "lucide-react";
import { Participant, Room, Track, TrackPublication } from 'livekit-client';
import '@livekit/components-styles';
import Image from "next/image";
  


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
//     <GridLayout tracks={tracks as any}>
//       {/* The GridLayout accepts zero or one child. The child is used
//           as a template to render all passed in tracks. */}
//       <ParticipantTile>
//         <AudioTrack trackRef={trackRef} />
//       </ParticipantTile>
//     </GridLayout>
//   );
// }
export default function LiveAudio({room}: {room: Room}) {
  const allMicTracks = useTracks(
    [{ source: Track.Source.Microphone, withPlaceholder: false }],
    { onlySubscribed: true }
  );

  const trackSupervisor = allMicTracks.find(t => t.participant.identity === `${room.name}-supervisor`);
  // const trackBot = allMicTracks.find(t => t.participant.identity === `${room.name}-bot`);
  const volumeSupervisor = useTrackVolume({ participant: trackSupervisor?.participant as Participant, source: Track.Source.Microphone, publication: trackSupervisor?.publication as TrackPublication });
  const volumeBot = room.activeSpeakers.reduce((a,part)=>{
    return a + (part.isAgent?part.audioLevel:0);
  },0);
  const [isRecording, setIsRecording] = useState(false);
  const trackVolume = room.localParticipant.audioLevel;
  
  return (
    <>
      <div className="flex pt-10 w-full justify-center">
        <button className="relative block rounded-full border-8 border-amber-50" onClick={async () => {
          if (room.state !== "connected") {
            console.log("Room not connected");
            return;
          }
          await room.localParticipant.setMicrophoneEnabled(!isRecording);
          setIsRecording(!isRecording);
        }}>

          <motion.div
            className="absolute top-0 left-0 w-full h-full bg-blue-500 rounded-full opacity-30"
            animate={{ scale: 1 + trackVolume * 2 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
          />
          <Image
            className={twMerge("dark:invert","rounded-full")}
            src="/mic.jpg"
            alt="Microphone logo"
            width={300}
            height={180}
            priority
          />
        </button>
      </div>

      <div className="text-2xl font-bold text-gray-500 text-center mt-10">Human in the Loop<br/>AI Calling</div>
      <div className="flex flex-row justify-center gap-10 mt-16">
        <div className="flex flex-row items-center justify-center gap-4 mt-10">
          <div>
            <h1>Supervisor</h1>
          </div>
          <div className={twMerge("relative w-auto h-auto flex items-center justify-center")}>
            <motion.div
              className="absolute top-0 left-0 w-full h-full bg-blue-500 rounded-full opacity-30"
              animate={{ scale: 1 + volumeSupervisor * 2 }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
            />
            <div
              className="absolute top-0 left-0 w-full h-full bg-green-500 rounded-full opacity-30"
            />
            <AudioWaveform
              className="text-blue-500"
              size={50}
            />
          </div>
        </div>
        <div className="flex flex-row items-center justify-center gap-4 mt-10">
          <div>
            <h1>Livekit</h1>
          </div>
          <div className={twMerge("relative w-auto h-auto flex items-center justify-center")}>
            <motion.div
              className="absolute top-0 left-0 w-full h-full bg-blue-500 rounded-full opacity-30"
              animate={{ scale: 1 + volumeBot * 2 }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
            />
            <div
              className="absolute top-0 left-0 w-full h-full bg-green-500 rounded-full opacity-30"
            />
            <Bot
              className="text-blue-500 p-1"
              size={50}
            />
          </div>
        </div>
      </div>
      <div data-lk-theme="default" className="w-full h-[610px]">
        {/* <MyVideoConference /> */}
        {/* The RoomAudioRenderer takes care of room-wide audio for you. */}
        <RoomAudioRenderer />
        {/* Controls for the user to start/stop audio, video, and screen share tracks */}
        <ControlBar controls={{microphone: true, camera: false , screenShare: false}} />
      </div>
    </>
  );
}
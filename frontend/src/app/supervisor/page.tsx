

"use client";

import { ControlBar, RoomAudioRenderer, RoomContext } from '@livekit/components-react';
import { Room } from 'livekit-client';
import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
type RoomInfo = {
  id: string;
  roomName: string;
  userId: string;
  request: "PENDING" | "RESOLVED";
};

const serverUrl = "wss://call-gpt-g9awkea8.livekit.cloud";

export default function SupervisorDashboard() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [joinedRoom, setJoinedRoom] = useState<Room | null>(null);
  const [isMicOn, setIsMicOn] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      const res = await fetch("/api/getPendingRooms");
      const data = await res.json();
      setRooms(data.rooms || []);
    };

    fetchRooms();
  }, []);

  const joinRoom = async (roomName: string) => {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    

    const participantName = `${roomName}-supervisor`;

    const tokenRes = await fetch("/api/createToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ participantName, roomName }),
    });

    const { token } = await tokenRes.json();

    await room.connect(serverUrl, token);
    console.log("Supervisor connected to room", roomName);
    setJoinedRoom(room);

    await fetch("/api/updateRoomStatus", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roomName, status: "RESOLVED" }),
    });
  };

  const toggleMic = async () => {
    if (!joinedRoom) return;
    const enabled = !isMicOn;
    await joinedRoom.localParticipant.setMicrophoneEnabled(enabled);
    setIsMicOn(enabled);
  };

  if (joinedRoom) {
    return (
      <RoomContext.Provider value={joinedRoom}>
        <div className="text-center p-10">
          <h2 className="text-xl font-bold mb-4">Supervisor Joined</h2>
          <button
            className={twMerge(
              "px-6 py-2 rounded text-white font-medium",
              isMicOn ? "bg-red-600" : "bg-green-600"
            )}
            onClick={toggleMic}
          >
            {isMicOn ? "Stop Mic" : "Start Mic"}
          </button>

          <div className="mt-10 w-full h-[300px]" data-lk-theme="default">
            <RoomAudioRenderer />
            <ControlBar controls={{ microphone: true, camera: false, screenShare: false }} />
          </div>
        </div>
      </RoomContext.Provider>
    );
  }

  return (
    <div className="p-10 text-center">
      <h1 className="text-2xl font-semibold mb-6">Pending Rooms</h1>
      {rooms.length === 0 ? (
        <p>No pending rooms</p>
      ) : (
        <ul className="space-y-4">
          {rooms.map((room) => (
            <li key={room.id} className="flex justify-between items-center bg-gray-100 p-4 rounded">
              <span className="text-lg text-gray-800 font-serif">{room.roomName}</span>
              <button
                onClick={() => joinRoom(room.roomName)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Join
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
import {
  type JobContext,
  WorkerOptions,
  cli,
  defineAgent,
  llm,
  type JobProcess,
  voice
} from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';
import * as silero from '@livekit/agents-plugin-silero';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { db } from './firebase.js';
import { RequestEnum } from './requestEnum.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath });

// Also load from environment variables (for Docker)
dotenv.config();

type Data = {
  room?: { name?: string };
};

class IntroAgent extends voice.Agent<Data> {
  async onEnter() {
    console.log('IntroAgent onEnter called - generating initial reply');
    this.session.generateReply({
      instructions: '"greet the user and gather information"',
    });
  }

  static create() {
    return new IntroAgent({
      instructions: `Say: "Hi there! I'm your personal assistant". You are a helpful assistant that collects user information for personalized help.`,
      tools: {
        connectSupervisor: llm.tool({
          description:
            'Escalate the conversation to a human supervisor when the assistant lacks capability or context. Trigger if the LLM is unsure or cannot provide a useful answer.',
          parameters: z.object({}).strict(),
          execute: async (_args, { ctx }) => {
            const roomName = ctx.userData?.room?.name;
            if (!roomName) {
              console.error('Room name is missing in userData');
              return 'Unable to connect to a supervisor because no room is associated with this session.';
            }

            console.log({ roomName });

            try {
              await db.collection('rooms').doc(roomName).update({
                request: RequestEnum.PENDING,
              });
            } catch (err) {
              console.error((err as Error).message);
              return 'Error connecting to a supervisor: ' + (err as Error).message;
            }

            return 'Connecting to a supervisor...';
          },
        }),
      },
    });
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    const userdata: Data = { room: { name: ctx.room?.name } };

    const session = new voice.AgentSession({
      vad: ctx.proc.userData.vad! as silero.VAD,
      llm: new google.beta.realtime.RealtimeModel(),
      userData: userdata,
    });

    

    console.log('Starting agent session with IntroAgent...');
    await session.start({
      agent: IntroAgent.create(),
      room: ctx.room,
    });
    const participant = await ctx.waitForParticipant();
    console.log('participant joined: ', participant.identity);
    const identity = participant.identity;
    if (identity.endsWith('-supervisor')) {
      console.log(`Supervisor joined the room: ${identity}`);
      return;
    }
    console.log('Agent session started successfully');
  },
});
cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));

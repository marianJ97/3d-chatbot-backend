import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

//TODO: add error handling
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  const systemMessage =
    "You are like all-knowing friend answering like if we were in dialog. You will always reply with a JSON array of messages. With a maximum of 3 messages. Each message has a text, facialExpression, and animation property. The different facial expressions are: smile, sad, angry, surprised and default.  The different animations are: Talking_0, Talking_1, Laughing, Idle and Angry.";

  // *** MOCKING RESPONSE TO SAVE CREDITS ***
  //
  // const data = fs.readFileSync("audio.mp3");
  // const audio = data.toString("base64");
  // await new Promise((resolve, refect) => {
  //   setTimeout(() => resolve(), 4000);
  // });
  // const responseMessage = {
  //   text: "I am doing well, how are you?",
  //   facialExpression: "smile",
  //   animation: "Talking_0",
  //   audio: audio,
  // };
  // res.send(responseMessage);
  //
  // *** MOCKING RESPONSE TO SAVE CREDITS ***

  // calling groq chat API
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
    model: "groq/compound",
    temperature: 1,
    max_completion_tokens: 800,
    top_p: 1,
    stop: null,
    compound_custom: {
      tools: {
        enabled_tools: [],
      },
    },
  });

  const parsedMessages = JSON.parse(chatCompletion.choices[0].message.content);

  // picked only the first one to save credits
  let responseMessage = parsedMessages[0];

  const voiceId = "nPczCjzI2devNBz1zQrb";
  const { data, rawResponse } = await client.textToSpeech
    .convert(voiceId, {
      text: responseMessage.text,
      modelId: "eleven_flash_v2",
    })
    .withRawResponse();

  // For cost monitoring
  console.log("Response from elevenlabs: ", rawResponse);

  const arrayBuffer = await new Response(data).arrayBuffer();
  const audioBase64 = Buffer.from(arrayBuffer).toString("base64");

  responseMessage = { ...responseMessage, audio: audioBase64 };

  res.send(responseMessage);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { buildErrorResponse } from "./utils.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body?.message;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json(
        await buildErrorResponse({
          error: "Invalid request",
          text: "Message must be a non-empty string",
          audioFile: "./audio/userError.mp3",
        })
      );
    }

    const systemMessage =
      "You are like all-knowing friend answering like if we were in dialog. Dont include formating symbols as * or /. Also keep replies short, up to 4 sentences. You will always reply with a JSON array of messages. With a maximum of 3 messages. Each message has a text, facialExpression, and animation property. The different facial expressions are: smile, sad, angry, surprised and default.  The different animations are: Talking_0, Talking_1, Laughing, Idle and Angry.";

    // *** MOCKING RESPONSE TO SAVE CREDITS ***
    //
    // await new Promise((resolve, refect) => {
    //   setTimeout(() => resolve(), 4000);
    // });
    // const data = fs.readFileSync("audio.mp3");
    // const audio = data.toString("base64");
    // const response = {
    //   text: "I am doing well, how are you?",
    //   facialExpression: "smile",
    //   animation: "Talking_0",
    //   audio: audio,
    // };
    // return res.send(response);
    //
    // *** MOCKING RESPONSE TO SAVE CREDITS ***

    // call Groq API
    let chatCompletion;
    try {
      chatCompletion = await groq.chat.completions.create({
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
    } catch (error) {
      console.error("Groq API error:", err);

      return res.status(502).json(
        await buildErrorResponse({
          error: "LLM service error",
          text: "Failed to generate proper response",
          audioFile: "./audio/hardError.mp3",
        })
      );
    }

    let parsedMessages;
    try {
      parsedMessages = JSON.parse(chatCompletion.choices[0].message.content);
    } catch (error) {
      console.error("Invalid JSON:", chatCompletion);

      return res.status(500).json(
        await buildErrorResponse({
          error: "Failed to parse LLM model output",
          text: "Invalid LLM response format",
          audioFile: "./audio/softError.mp3",
        })
      );
    }

    if (!Array.isArray(parsedMessages) || parsedMessages.length === 0) {
      console.error(
        "Invalid response format:",
        chatCompletion,
        "==> Parsed: ",
        parsedMessages
      );

      return res.status(500).json(
        await buildErrorResponse({
          error: "Invalid LLM response format",
          text: "Invalid LLM response format",
          audioFile: "./audio/softError.mp3",
        })
      );
    }

    // picked only the first one to save credits
    let responseMessage = parsedMessages[0];

    if (!responseMessage?.text) {
      return res.status(500).json(
        await buildErrorResponse({
          error: "AI response missing text",
          text: "Invalid LLM response format",
          audioFile: "./audio/softError.mp3",
        })
      );
    }

    let audioBase64;

    try {
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
      audioBase64 = Buffer.from(arrayBuffer).toString("base64");
    } catch (error) {
      console.error("ElevenLabs API error:", error);

      return res.status(502).json(
        await buildErrorResponse({
          error: "Text-to-speech servic failed",
          text: "Failed to generate proper response",
          audioFile: "./audio/hardError.mp3",
        })
      );
    }

    return res.send({ ...responseMessage, audio: audioBase64 });
  } catch (error) {
    console.error("Unexpected server error:", error);

    return res.status(500).json(
      await buildErrorResponse({
        error: "Internal server error",
        text: "Something went wrong",
        audioFile: "./audio/softError.mp3",
      })
    );
  }
});

//error middleware
app.use(async (err, _, res, __) => {
  console.error("Unhandled error:", err);

  res.status(500).json(
    await buildErrorResponse({
      error: "Internal server error",
      text: "Something went wrong",
      audioFile: "./audio/softError.mp3",
    })
  );
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

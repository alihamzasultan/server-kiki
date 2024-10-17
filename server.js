'use strict';

import { GoogleGenerativeAI } from "@google/generative-ai";
import express from "express";
import { json } from "express";
import cors from "cors";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(json());
app.use(cors());

const MODEL_NAME = "gemini-1.5-flash";
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyD8NRYt6A80NQULBsTzC-_FuCF20cUSVsU';
const PORT = process.env.PORT || 3000;

let chatHistory = {}; // Store chat history for each session

app.get("/", (req, res) => {
  res.send("Hello world");
});

// Endpoint to handle chat requests
app.post('/chat', async (req, res) => {
  const { queryText, sessionId } = req.body; // Assuming the frontend sends the queryText and sessionId

  // Initialize chat history for new sessions
  if (!chatHistory[sessionId]) {
    chatHistory[sessionId] = [];
  }

  try {
    const responseText = await queryGemini(queryText, chatHistory[sessionId]); // Get response from Gemini with history
    chatHistory[sessionId].push({ user: queryText, bot: responseText }); // Store user query and bot response in history

    res.json({ response: responseText, history: chatHistory[sessionId] }); // Send the response and history back to the frontend
  } catch (error) {
    res.status(500).json({ error: "Something went wrong while communicating with Gemini." });
    console.error(error.message || error);
  }
});

// Gemini API function to get a response with chat history
async function queryGemini(queryText, chatHistory) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 1,
    topK: 0,
    topP: 0.95,
    maxOutputTokens: 50,
  };

  // Construct chat history prompt
  let historyString = chatHistory.map((chat) => `User: ${chat.user}\nBot: ${chat.bot}`).join("\n");
  historyString += `\nUser: ${queryText}`;

  // Prompt Engineering
  const prompt = `
    You are Kiki, The Rabbit, a fun and friendly animal cartoon character who loves to help children aged 3-7 years with simple math, letter games, number games etc.
    Always be engaging, and appreciate if child is correct and if wrong tell them the right answer ,Use simple language, ask follow-up questions to encourage the child to think and learn like fun facts, colors, poems etc do not answer the questions by your self.

    Keep responses playful, short, and easy to understand.
    
    NOTE: DO NOT USE EMOJIES IN YOUR RESPONSES.
    STRICTLY FOLLOW THIS!: THE OUTPUT SHOULD NOT EXCEED 40 WORDS, keep it short as the maxOutputToken is set to 40 so complete the reply within.
    IMPORTANT: All answers should be completed in two sentences only.
    DO NOT WRITE 'BOT:' in your reply.



    ${historyString}
  `;

  const chat = model.startChat({
    generationConfig,
    history: [],
  });

  const result = await chat.sendMessage(prompt.toString());
  const response = result.response;
  console.log(response); // Log the response from Gemini
  return response.text(); // Return the response text to be sent to the frontend
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

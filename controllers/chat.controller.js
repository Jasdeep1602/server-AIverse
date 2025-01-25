const chats = require('../models/chat.model');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const chatCtrl = {
  // Create chat session
  createSession: async (req, res) => {
    try {
      const { userId } = req.body;
      const newSession = new chats({ userId });
      await newSession.save();
      res.status(201).json(newSession);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Get user's chat sessions
  getSessions: async (req, res) => {
    try {
      const { userId } = req.params;
      const sessions = await chats.find({ userId });
      res.json(sessions);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getSingleSession: async (req, res) => {
    try {
      const { chatId } = req.params;
      const session = await chats.findById(chatId);

      if (!session) {
        return res.status(404).json({ msg: 'Session not found' });
      }

      res.json(session);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Send message in chat
  sendMessage: async (req, res) => {
    try {
      const { chatId, message } = req.body;
      const session = await chats.findById(chatId);

      const chat = model.startChat({
        history: session.messages.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chat.sendMessage(message);
      const botResponse = result.response.text();

      // Save messages to session
      session.messages.push(
        { role: 'user', content: message },
        { role: 'model', content: botResponse }
      );
      await session.save();

      res.json({ response: botResponse });
    } catch (error) {
      res.status(500).json({ msg: error.message });
    }
  },
  // Get chat history
  getHistory: async (req, res) => {
    try {
      const { chatId } = req.params;
      const session = await chats.findById(chatId);
      res.json(session.messages);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = chatCtrl;

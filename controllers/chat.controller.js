const chats = require('../models/chat.model');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const generateTitle = async (messages) => {
  try {
    // Create a summary prompt from the first few messages
    let contextMessages = messages.slice(0, 4); // Take first 4 messages
    let conversationContext = contextMessages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Initialize chat with Gemini
    const chat = model.startChat();

    // Send prompt to generate title
    const result = await chat.sendMessage(
      `Based on this conversation, generate a very brief title (3-4 words max) that captures the main topic. Only respond with the title, nothing else:\n\n${conversationContext}`
    );

    let title = result.response.text().trim();

    // Ensure title is not too long
    if (title.split(' ').length > 4) {
      title = title.split(' ').slice(0, 4).join(' ');
    }

    return title;
  } catch (error) {
    console.error('Title generation error:', error);
    return 'New Chat';
  }
};

const chatCtrl = {
  // Create chat session
  createSession: async (req, res) => {
    try {
      const { userId } = req.body;
      const newSession = new chats({ userId, createdAt: new Date() });
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
      const sessions = await chats.find({ userId }).sort({ createdAt: -1 });
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

      // Generate title if it's still the default
      if (session.title === 'New Chat' && session.messages.length >= 2) {
        const newTitle = await generateTitle(session.messages);
        session.title = newTitle;
      }

      await session.save();

      res.json({ user: message, response: botResponse, title: session.title });
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
  deleteSession: async (req, res) => {
    try {
      const { chatId } = req.params;
      const deletedSession = await chats.findByIdAndDelete(chatId);

      if (!deletedSession) {
        return res.status(404).json({ msg: 'Chat session not found' });
      }

      res.json({ msg: 'Chat session deleted successfully' });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  updateTitle: async (req, res) => {
    try {
      const { chatId } = req.params;
      const session = await chats.findById(chatId);

      if (!session) {
        return res.status(404).json({ msg: 'Session not found' });
      }

      const newTitle = await generateTitle(session.messages);
      session.title = newTitle;
      await session.save();

      res.json({ title: session.title });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = chatCtrl;

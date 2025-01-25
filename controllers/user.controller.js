const users = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const crypto = require('crypto');
require('dotenv').config();

// Configure Brevo
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Temporary storage for verification codes
const verificationCodes = {};

const userCtrl = {
  // Send verification code
  sendVerificationCode: async (req, res) => {
    try {
      const { email } = req.body;

      // Check if email already exists
      const existingUser = await users.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ msg: 'Email already registered' });
      }

      // Generate 6-digit verification code
      const verificationCode = crypto.randomInt(100000, 999999).toString();

      // Store code with timestamp
      verificationCodes[email] = {
        code: verificationCode,
        createdAt: Date.now(),
      };

      // Brevo email configuration
      const transactionalEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      sendSmtpEmail.subject = 'Email Verification Code';
      sendSmtpEmail.htmlContent = `Your verification code is: <strong>${verificationCode}</strong>`;
      sendSmtpEmail.sender = {
        name: 'AIverse',
        email: process.env.BREVO_SENDER_EMAIL,
      };
      sendSmtpEmail.to = [{ email: email }];

      // Send verification email
      await transactionalEmailApi.sendTransacEmail(sendSmtpEmail);

      res.json({ msg: 'Verification code sent' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: err.message });
    }
  },

  // Verify email code
  verifyCode: async (req, res) => {
    try {
      const { email, code } = req.body;

      const storedCode = verificationCodes[email];

      // Validate code
      if (!storedCode) {
        return res.status(400).json({ msg: 'No verification code sent' });
      }

      // Check code and expiration (15 minutes)
      if (
        storedCode.code !== code ||
        Date.now() - storedCode.createdAt > 15 * 60 * 1000
      ) {
        return res.status(400).json({ msg: 'Invalid or expired code' });
      }

      // Mark email as verified
      delete verificationCodes[email];

      res.json({ msg: 'Email verified successfully', emailVerified: true });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // Registration with email verification
  register: async (req, res) => {
    try {
      const { name, email, password, dob, emailVerified } = req.body;

      // Ensure email is verified
      if (!emailVerified) {
        return res.status(400).json({ msg: 'Email must be verified first' });
      }

      // Check existing user
      const user = await users.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: 'Email already registered' });
      }

      // Password validation
      if (password.length < 6) {
        return res
          .status(400)
          .json({ msg: 'Password must be at least 6 characters' });
      }

      // Password encryption
      const passwordHash = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = new users({
        name,
        email,
        dob,
        password: passwordHash,
        emailVerified: true,
      });

      // Save to database
      await newUser.save();

      res.json({ msg: 'Account Created Successfully' });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  // login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await users.findOne({ email });

      if (!user) return res.status(400).json({ msg: 'User does not exist' });

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) return res.status(400).json({ msg: 'Incorrect Password' });

      const accesstoken = createAccessToken({ id: user._id });

      // Prepare user info (excluding sensitive data)
      const userInfo = {
        id: user._id,
        name: user.name,
        email: user.email,
        dob: user.dob,
      };

      // Send response with token and user info
      res.json({
        accesstoken,
        user: userInfo,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.msg });
    }
  },

  //logout
  logout: async (req, res) => {
    try {
      return res.json({ msg: 'logged out' });
    } catch (err) {
      return res.status(500).json({ msg: err.msg });
    }
  },

  // info user
  getUser: async (req, res) => {
    try {
      const user = await users.findById(req.user.id).select('-password');
      if (!user) return res.status(400).json({ msg: 'User not found' });
      res.json(user);
    } catch {
      return res.status(500).json({ msg: err.msg });
    }
  },
};

const createAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '1d',
  });
};

module.exports = userCtrl;

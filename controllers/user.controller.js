const users = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const userCtrl = {
  // register

  register: async (req, res) => {
    try {
      const { name, email, password, dob } = req.body;

      const user = await users.findOne({ email });
      if (user)
        return res.status(400).json({ msg: 'Email already Registered' });
      if (password.length < 6)
        return res
          .status(400)
          .json({ msg: 'Password is atLeast 6 characters' });

      //paassword encryption

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = new users({
        name,
        email,
        dob,
        password: passwordHash,
      });

      //save mongodb

      await newUser.save();
      res.json({ msg: 'Account Created ' });
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

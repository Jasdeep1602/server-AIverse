const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const cors = require('cors');
const { urlencoded } = require('express');

const app = express();
app.use(urlencoded({ extended: true }));
app.use(express.json());

// enable cors

const corsOptions = {
  origin: 'https://quantum-mauve.vercel.app',
  credentials: true,
};
app.use(cors(corsOptions));

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.json('home route');
});

app.listen(PORT, () => {
  console.log('server is running');
});

//routes

app.use('/user', require('./routes/user.route'));

//connect mongodb

const URI = process.env.MONGODB_URL;

mongoose
  .connect(URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.log(err);
  });

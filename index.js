const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// 1. Middleware Setup
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 2. Connect to MongoDB
// REPLACE WITH THIS:
mongoose.connect(process.env.MONGO_URI);

// 3. Schemas and Models (Step 2)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

// 4. API Routes (Step 3)

// Serve HTML home page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users - Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const userObj = new User({ username: req.body.username });
    const user = await userObj.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/users - Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/users/:_id/exercises - Add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.send('Could not find user');
    }

    const exerciseObj = new Exercise({
      user_id: id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });

    const exercise = await exerciseObj.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/users/:_id/logs - Get exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.send('Could not find user');
    }

    let dateObj = {};
    if (from) {
      dateObj['$gte'] = new Date(from);
    }
    if (to) {
      dateObj['$lte'] = new Date(to);
    }

    let filter = { user_id: id };
    if (from || to) {
      filter.date = dateObj;
    }

    let query = Exercise.find(filter);
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const exercises = await query.exec();

    const log = exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: new Date(e.date).toDateString()
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// 5. Start Server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

require('dotenv').config();
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const io = new Server(server);

// MongoDB connection
mongoose.connect('mongodb+srv://dbUser:dbUserPassword@alex.1p8hvrf.mongodb.net/loginApp?retryWrites=true&w=majority&appName=Alex', {
}).then(() => {
  console.log('MongoDB Atlas connected ✅');
}).catch(err => {
  console.error('MongoDB Atlas connection error ❌', err);
});

// Schema
const loginSchema = new mongoose.Schema({
  user: String,
  pass: String,
  notes: [String],
  ip: String
});
const Login = mongoose.model('Login', loginSchema);

// Serve static files
app.use(express.static(__dirname));

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Socket.IO logic
io.on('connection', (socket) => {
  const ip = socket.handshake.address;
  console.log(`User connected from IP: ${ip}`);

  // Signup
  socket.on('signUp', async ({ ruser, rpass }) => {
    if (!ruser || !ruser.trim() || !rpass || !rpass.trim()) {
      return socket.emit('signUpResponse', {
        success: false,
        message: 'Username and password required ❌',
      });
    }

    const existing = await Login.findOne({ user: ruser });
    if (existing) {
      return socket.emit('signUpResponse', {
        success: false,
        message: 'Username already exists ❌',
      });
    }

    const accountCount = await Login.countDocuments({ ip });
    if (accountCount >= 5) {
      return socket.emit('signUpResponse', {
        success: false,
        message: 'Maximum 5 accounts allowed per device ❌',
      });
    }

    try {
      const newLogin = new Login({ user: ruser, pass: rpass, notes: [], ip });
      await newLogin.save();
      socket.emit('signUpResponse', { success: true, message: 'Account created ✅' });
    } catch (err) {
      console.error('Signup error:', err);
      socket.emit('signUpResponse', { success: false, message: 'Signup failed ❌' });
    }
  });

  // Login
  socket.on('login', async ({ user, pass }) => {
    try {
      const foundUser = await Login.findOne({ user });

      if (!foundUser) {
        return socket.emit('loginResponse', { success: false, message: "User not found ❌" });
      }

      if (foundUser.pass !== pass) {
        return socket.emit('loginResponse', { success: false, message: "Incorrect password ❌" });
      }

      socket.emit('loginResponse', {
        success: true,
        message: "Login successful ✅",
        user: foundUser.user,
        notes: foundUser.notes
      });

    } catch (err) {
      console.error("Login error ❌:", err);
      socket.emit('loginResponse', { success: false, message: "Server error ❌" });
    }
  });

  // Save note
  socket.on('saveNote', async ({ username, note }) => {
    try {
      const user = await Login.findOne({ user: username });
      if (!user) return socket.emit('noteResponse', { success: false, message: "User not found ❌" });

      if (user.notes.length >= 15) {
        return socket.emit('noteResponse', {
          success: false,
          message: "Maximum 15 notes allowed per account ❌"
        });
      }

      user.notes.push(note);
      await user.save();

      socket.emit('noteResponse', {
        success: true,
        message: "Note saved ✅",
        notes: user.notes
      });

    } catch (err) {
      console.error("Error saving note:", err);
      socket.emit('noteResponse', { success: false, message: "Error saving note ❌" });
    }
  });

  // Delete note
  socket.on('deleteNote', async ({ username, note }) => {
    try {
      const user = await Login.findOne({ user: username });
      if (!user) return socket.emit('noteResponse', { success: false, message: "User not found ❌" });

      user.notes = user.notes.filter(n => n !== note);
      await user.save();

      socket.emit('noteResponse', { success: true, message: "Note deleted ✅", notes: user.notes });
    } catch (err) {
      console.error("Delete error ❌", err);
      socket.emit('noteResponse', { success: false, message: "Failed to delete note ❌" });
    }
  });
  // Delete account
socket.on('deleteAccount', async (username) => {
  try {
    const deleted = await Login.deleteOne({ user: username });
    if (deleted.deletedCount === 1) {
      socket.emit('accountDeleted', { success: true, message: "Account deleted ✅" });
    } else {
      socket.emit('accountDeleted', { success: false, message: "Account not found ❌" });
    }
  } catch (err) {
    console.error("Account delete error ❌", err);
    socket.emit('accountDeleted', { success: false, message: "Error deleting account ❌" });
  }
});

// Clear all notes
socket.on('clearNotes', async (username) => {
  try {
    const user = await Login.findOne({ user: username });
    if (!user) {
      return socket.emit('noteResponse', { success: false, message: "User not found ❌" });
    }

    user.notes = [];
    await user.save();
    socket.emit('noteResponse', {
      success: true,
      message: "All notes cleared ✅",
      notes: []
    });
  } catch (err) {
    console.error("Clear notes error ❌", err);
    socket.emit('noteResponse', { success: false, message: "Failed to clear notes ❌" });
  }
});

});

server.listen(3000, () => {
  console.log("Listening on *:3000");
});

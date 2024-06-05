// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { createClient } = require('redis'); // Importing Redis client
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3001", // Allow requests from this origin
    methods: ["GET", "POST"]
  }
});

app.use(cors());

const redisClient = createClient({
  url: 'redis://127.0.0.1:6379' // Specify the Redis host and port
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
redisClient.connect().then(() => {
  console.log('Connected to Redis');

  io.on('connection', (socket) => {
    console.log('New client connected');

    // Add user to matchmaking queue
    socket.on('joinQueue', async () => {
      const userId = socket.id;
      await redisClient.lPush('queue', userId); // Correct method name

      const queueLength = await redisClient.lLen('queue'); // Correct method name
      if (queueLength >= 2) {
        // Get two users from the queue
        const user1 = await redisClient.rPop('queue'); // Correct method name
        const user2 = await redisClient.rPop('queue'); // Correct method name

        // Notify users to start a video chat
        io.to(user1).emit('matched', user2);
        io.to(user2).emit('matched', user1);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Redis connection failed:', err);
});

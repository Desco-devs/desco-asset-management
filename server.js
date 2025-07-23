// CHAT APP TEMPORARILY DISABLED FOR PRODUCTION BUILD
// TODO: Re-enable when chat app is ready for production

// const { createServer } = require('http');
// const { parse } = require('url');
// const next = require('next');
// const { Server } = require('socket.io');

// const dev = process.env.NODE_ENV !== 'production';
// const hostname = 'localhost';
// const port = process.env.PORT || 3000;

// // Set environment variable to indicate custom server is running
// process.env.CUSTOM_SERVER = 'true';

// const app = next({ dev, hostname, port });
// const handle = app.getRequestHandler();

// app.prepare().then(() => {
//   const httpServer = createServer((req, res) => {
//     const parsedUrl = parse(req.url, true);
//     handle(req, res, parsedUrl);
//   });

//   // Initialize Socket.io server
//   const io = new Server(httpServer, {
//     cors: {
//       origin: [
//         'http://localhost:3000',
//         'https://your-vercel-app.vercel.app',
//         process.env.CLIENT_URL || 'http://localhost:3000'
//       ],
//       methods: ['GET', 'POST'],
//       credentials: true,
//     },
//     transports: ['websocket', 'polling'],
//   });

//   // Store user socket connections
//   const userSockets = new Map(); // userId -> Set of socket ids
//   const socketUsers = new Map(); // socket.id -> userId

//   io.on('connection', (socket) => {
//     console.log('User connected:', socket.id);

//     // Handle user authentication and join their personal room
//     socket.on('user:authenticate', async (userId) => {
//       if (!userId) return;
      
//       // Store user connection
//       socketUsers.set(socket.id, userId);
      
//       if (!userSockets.has(userId)) {
//         userSockets.set(userId, new Set());
//       }
      
//       userSockets.get(userId).add(socket.id);
//       socket.join(`user:${userId}`);
      
//       // Broadcast user online status
//       socket.broadcast.emit('user:online', userId);
      
//       console.log(`User ${userId} authenticated with socket ${socket.id}`);
//     });

//     // Handle joining rooms
//     socket.on('room:join', (roomId) => {
//       socket.join(roomId);
//       console.log(`Socket ${socket.id} joined room ${roomId}`);
//     });

//     // Handle leaving rooms
//     socket.on('room:leave', (roomId) => {
//       socket.leave(roomId);
//       console.log(`Socket ${socket.id} left room ${roomId}`);
//     });

//     // Handle message sending
//     socket.on('message:send', async (data) => {
//       const { roomId, content, senderId, tempId } = data;
      
//       try {
//         // Here you would normally save to database
//         // For now, just broadcast the message
//         const message = {
//           id: tempId || Date.now().toString(),
//           roomId,
//           content,
//           senderId,
//           createdAt: new Date().toISOString(),
//           type: 'TEXT'
//         };

//         // Broadcast to room members
//         io.to(roomId).emit('message:new', message);
        
//         // Send acknowledgment to sender
//         socket.emit('message:ack', { tempId, messageId: message.id });
        
//       } catch (error) {
//         console.error('Error handling message:', error);
//         socket.emit('message:error', { tempId, error: 'Failed to send message' });
//       }
//     });

//     // Handle typing indicators
//     socket.on('typing:start', (data) => {
//       socket.to(data.roomId).emit('typing:start', {
//         userId: socketUsers.get(socket.id),
//         roomId: data.roomId
//       });
//     });

//     socket.on('typing:stop', (data) => {
//       socket.to(data.roomId).emit('typing:stop', {
//         userId: socketUsers.get(socket.id),
//         roomId: data.roomId
//       });
//     });

//     // Handle room creation
//     socket.on('room:created', (data) => {
//       const { room, creatorId, invitedUsers = [] } = data;
      
//       // Notify creator
//       io.to(`user:${creatorId}`).emit('room:created', { room, creatorId });
      
//       // Notify invited users
//       invitedUsers.forEach(userId => {
//         io.to(`user:${userId}`).emit('invitation:received', { room, invitedBy: creatorId });
//       });
//     });

//     // Handle disconnection
//     socket.on('disconnect', (reason) => {
//       console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
      
//       const userId = socketUsers.get(socket.id);
//       if (userId && userSockets.has(userId)) {
//         userSockets.get(userId).delete(socket.id);
        
//         // If no more sockets for this user, mark as offline
//         if (userSockets.get(userId).size === 0) {
//           userSockets.delete(userId);
//           socket.broadcast.emit('user:offline', userId);
//         }
//       }
      
//       socketUsers.delete(socket.id);
//     });
//   });

//   httpServer
//     .once('error', (err) => {
//       console.error(err);
//       process.exit(1);
//     })
//     .listen(port, () => {
//       console.log(`> Ready on http://${hostname}:${port}`);
//       console.log(`> Socket.io server integrated and running on the same port`);
//     });
// });

console.log('CHAT APP TEMPORARILY DISABLED FOR PRODUCTION BUILD');
console.log('Server.js file has been disabled. Please use "npm run dev:next" for development without chat features.');
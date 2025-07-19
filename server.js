const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXTAUTH_URL 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Make io instance available globally for API routes
  global.io = io;

  // Store user socket connections
  const userSockets = new Map(); // userId -> Set of socket ids
  const socketUsers = new Map(); // socket.id -> userId

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user authentication and join their personal room
    socket.on('user:authenticate', async (userId) => {
      if (!userId) return;
      
      // Store user connection
      socketUsers.set(socket.id, userId);
      
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
        
        // Update user status to online in database (only on first connection)
        try {
          await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              isOnline: true,
              lastSeen: new Date().toISOString(),
            }),
          });
        } catch (error) {
          console.error('Error updating user online status:', error);
        }
        
        // Send current online users to the newly authenticated user
        const currentOnlineUsers = Array.from(userSockets.keys()).filter(id => id !== userId);
        socket.emit('users:online_list', currentOnlineUsers);
        
        // Notify others that this user is online
        socket.broadcast.emit('user:online', userId);
      }
      
      userSockets.get(userId).add(socket.id);
      
      // Join user's personal room for receiving invitations
      socket.join(`user:${userId}`);
      
      console.log(`User ${userId} authenticated with socket ${socket.id}`);
    });

    // Handle joining specific chat rooms
    socket.on('room:join', (roomId) => {
      socket.join(`room:${roomId}`);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // Handle leaving specific chat rooms
    socket.on('room:leave', (roomId) => {
      socket.leave(`room:${roomId}`);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    // Handle room creation
    socket.on('room:created', (data) => {
      const { room, invitations, creatorId } = data;
      
      // Notify invited users about new room invitation
      if (invitations && invitations.length > 0) {
        invitations.forEach(invitation => {
          io.to(`user:${invitation.invited_user}`).emit('invitation:received', {
            room,
            invitation,
            inviter: invitation.inviter
          });
        });
      }
      
      console.log(`Room ${room.id} created by user ${creatorId}, ${invitations.length} invitations sent`);
    });

    // Handle invitation responses
    socket.on('invitation:responded', (data) => {
      const { invitationId, userId, action, room } = data;
      
      if (action === 'ACCEPTED') {
        // Notify all room members that someone joined
        io.to(`room:${room.id}`).emit('member:joined', {
          roomId: room.id,
          userId: userId,
          user: data.user
        });
        
        // Notify the inviter specifically
        if (room.owner_id) {
          io.to(`user:${room.owner_id}`).emit('invitation:accepted', {
            roomId: room.id,
            userId: userId,
            invitationId: invitationId
          });
        }
      }
      
      console.log(`Invitation ${invitationId} ${action} by user ${userId}`);
    });

    // Handle sending messages - now saves to database and broadcasts
    socket.on('message:send', async (data) => {
      const { roomId, content, senderId, type = 'TEXT', tempId } = data;
      
      try {
        // Save message to database
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/messages/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId,
            content,
            senderId,
            type
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          const message = result.message;
          
          // Validate message before broadcasting
          if (message && message.room_id) {
            // Broadcast message to all room members except sender
            socket.to(`room:${roomId}`).emit('message:new', message);
            
            // Send acknowledgment back to sender with real message
            socket.emit('message:ack', { tempId, message });
            
            console.log(`Message saved and broadcast to room ${roomId} by ${senderId}`);
          } else {
            console.error('Invalid message received from API:', message);
            socket.emit('message:error', { tempId, error: 'Invalid message format' });
          }
        } else {
          // Send error back to sender
          socket.emit('message:error', { tempId, error: 'Failed to save message' });
        }
      } catch (error) {
        console.error('Error handling message:send:', error);
        socket.emit('message:error', { tempId, error: 'Internal server error' });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      const { roomId, user } = data;
      socket.to(`room:${roomId}`).emit('user:typing', { roomId, user });
    });

    socket.on('typing:stop', (data) => {
      const { roomId, userId } = data;
      socket.to(`room:${roomId}`).emit('user:stopped_typing', { roomId, userId });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      const userId = socketUsers.get(socket.id);
      
      if (userId) {
        const userSocketSet = userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          
          // If user has no more connections, mark as offline
          if (userSocketSet.size === 0) {
            userSockets.delete(userId);
            
            // Update user status to offline in database
            try {
              await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  isOnline: false,
                  lastSeen: new Date().toISOString(),
                }),
              });
            } catch (error) {
              console.error('Error updating user offline status:', error);
            }
            
            socket.broadcast.emit('user:offline', userId);
          }
        }
        
        socketUsers.delete(socket.id);
      }
      
      console.log('User disconnected:', socket.id);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.io server running on port ${port}`);
    });
});
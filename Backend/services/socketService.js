let io = null;

module.exports = {
  init: (server) => {
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('Socket client connected:', socket.id);
      socket.on('disconnect', () => {
        console.log('Socket client disconnected:', socket.id);
      });
    });

    return io;
  },
  getIo: () => io,
  emitRefresh: (type) => {
    if (io) {
      console.log('Emitting real-time page refresh event for:', type);
      io.emit('refresh_data', { type });
    }
  }
};

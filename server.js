// server.js - Backend do Abobora Call
const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", // Permite todos os domínios
    methods: ["GET", "POST"]
  }
});

// Fila de espera
let waitingUsers = [];

// Servir arquivos estáticos (para produção)
app.use(express.static(path.join(__dirname, 'public')));

// Rota de teste
app.get('/test', (req, res) => {
  res.json({ status: 'online', users: waitingUsers.length });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('🔗 Novo usuário:', socket.id);

  // Entrar na fila
  socket.on('join-pool', (userData) => {
    console.log(`👤 ${userData.username} entrou na fila`);
    
    socket.userData = {
      id: socket.id,
      ...userData
    };
    
    waitingUsers.push(socket);
    matchUsers();
  });

  // Pedir novo parceiro
  socket.on('find-new-partner', () => {
    console.log(`🔄 ${socket.userData?.username || socket.id} quer novo parceiro`);
    matchUsers();
  });

  // Desconectar
  socket.on('disconnect', () => {
    console.log('❌ Desconectado:', socket.id);
    waitingUsers = waitingUsers.filter(user => user.id !== socket.id);
    
    // Avisa parceiro se estiver em call
    if (socket.partnerId) {
      io.to(socket.partnerId).emit('partner-disconnected');
    }
  });
});

// Emparelhar usuários
function matchUsers() {
  console.log(`👥 Fila: ${waitingUsers.length} usuários`);
  
  if (waitingUsers.length >= 2) {
    const user1 = waitingUsers.shift();
    const user2 = waitingUsers.shift();
    
    console.log(`🤝 Emparelhando: ${user1.userData.username} ↔ ${user2.userData.username}`);
    
    // Define parceiros
    user1.partnerId = user2.id;
    user2.partnerId = user1.id;
    
    // Troca dados
    user1.emit('partner-found', user2.userData);
    user2.emit('partner-found', user1.userData);
  }
}

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Teste: https://abobora-call-true.onrender.comt`);

});

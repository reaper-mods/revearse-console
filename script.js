let ws;
let terminal;
let commandInput;

function init() {
    terminal = document.getElementById('terminal');
    commandInput = document.getElementById('commandInput');
    
    connectWebSocket();
}

function connectWebSocket() {
    // Connect to WebSocket server
    // Use wss:// for HTTPS or ws:// for HTTP
    ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => {
        updateConnectionStatus(true);
        addToTerminal('Connected to server', 'success');
    };
    
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
    };
    
    ws.onclose = () => {
        updateConnectionStatus(false);
        addToTerminal('Disconnected from server. Reconnecting...', 'error');
        setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (error) => {
        addToTerminal('Connection error', 'error');
    };
}

function handleServerMessage(message) {
    switch(message.type) {
        case 'command_result':
            addToTerminal(message.data, 'success');
            break;
        case 'screenshot':
            displayScreenshot(message.data);
            addToTerminal('Screenshot received!', 'success');
            break;
        case 'error':
            addToTerminal(message.data, 'error');
            break;
        case 'device_info':
            addToTerminal(message.data, 'success');
            break;
        case 'device_list':
            updateDeviceList(message.data);
            break;
        case 'message':
            addToTerminal(message.data, 'success');
            break;
        default:
            addToTerminal(JSON.stringify(message), 'success');
    }
}

function executeCommand(cmd) {
    const command = cmd || commandInput.value.trim();
    
    if (!command) return;
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        addToTerminal('Not connected to server', 'error');
        return;
    }
    
    addToTerminal(`> ${command}`, 'command');
    ws.send(command);
    
    if (!cmd) {
        commandInput.value = '';
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        executeCommand();
    }
}

function addToTerminal(text, type = 'success') {
    const output = document.createElement('div');
    output.className = `output ${type}`;
    output.textContent = text;
    terminal.appendChild(output);
    terminal.scrollTop = terminal.scrollHeight;
}

function clearTerminal() {
    terminal.innerHTML = '';
}

function updateConnectionStatus(connected) {
    const status = document.getElementById('connectionStatus');
    if (connected) {
        status.textContent = 'Connected';
        status.className = 'connected';
    } else {
        status.textContent = 'Disconnected';
        status.className = '';
    }
}

function updateDeviceList(devices) {
    const deviceList = document.getElementById('deviceList');
    if (devices.length === 0) {
        deviceList.innerHTML = 'No devices connected';
        return;
    }
    
    deviceList.innerHTML = devices.map(device => 
        `<div class="device-item">
            <strong>${device.info}</strong> (ID: ${device.id})
        </div>`
    ).join('');
}

function displayScreenshot(base64Data) {
    const container = document.getElementById('screenshotContainer');
    const image = document.getElementById('screenshotImage');
    
    image.src = `data:image/jpeg;base64,${base64Data}`;
    container.style.display = 'block';
}

// Initialize when page loads
window.onload = init;
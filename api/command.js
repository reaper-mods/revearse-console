// Use module-level variables (they persist during function lifetime)
let messageQueue = [];
let connectedDevices = [];
let lastId = 0;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'POST') {
        try {
            const { action, data } = req.body || {};

            if (action === 'register') {
                connectedDevices = connectedDevices.filter(d => Date.now() - d.lastSeen < 60000);
                connectedDevices.push({ id: Date.now(), info: data, lastSeen: Date.now() });
                res.status(200).json({ success: true });
                return;
            }

            lastId++;
            messageQueue.push({
                id: lastId,
                type: action === 'command' ? 'pending_command' : action,
                data: data,
                time: Date.now()
            });

            if (messageQueue.length > 200) {
                messageQueue = messageQueue.slice(-200);
            }

            res.status(200).json({ success: true });
            return;
        } catch (e) {
            res.status(500).json({ error: e.message });
            return;
        }
    }

    if (req.method === 'GET') {
        try {
            const since = parseInt(req.query?.since) || 0;
            connectedDevices = connectedDevices.filter(d => Date.now() - d.lastSeen < 60000);
            const newMessages = messageQueue.filter(m => m.id > since);
            
            if (messageQueue.length > 500) {
                messageQueue = messageQueue.slice(-300);
            }

            res.status(200).json({
                messages: newMessages,
                devices: connectedDevices,
                lastId: lastId
            });
            return;
        } catch (e) {
            res.status(500).json({ error: e.message });
            return;
        }
    }

    res.status(200).json({ messages: [], devices: [], lastId: 0 });
}

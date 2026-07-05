export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    let messageQueue = global.messageQueue || [];
    let connectedDevices = global.connectedDevices || [];
    let lastId = global.lastId || 0;

    if (req.method === 'POST') {
        const { action, data } = req.body || {};

        if (action === 'register') {
            connectedDevices = connectedDevices.filter(d => Date.now() - d.lastSeen < 60000);
            connectedDevices.push({ id: Date.now(), info: data, lastSeen: Date.now() });
            global.connectedDevices = connectedDevices;
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

        if (messageQueue.length > 200) messageQueue = messageQueue.slice(-200);

        global.messageQueue = messageQueue;
        global.lastId = lastId;
        res.status(200).json({ success: true });
        return;
    }

    if (req.method === 'GET') {
        const since = parseInt(req.query?.since) || 0;
        connectedDevices = (connectedDevices || []).filter(d => Date.now() - d.lastSeen < 60000);
        const newMessages = (messageQueue || []).filter(m => m.id > since);
        if ((messageQueue || []).length > 500) messageQueue = messageQueue.slice(-300);
        global.connectedDevices = connectedDevices;
        global.messageQueue = messageQueue;

        res.status(200).json({
            messages: newMessages,
            devices: connectedDevices,
            lastId: lastId
        });
        return;
    }

    res.status(200).json({ messages: [], devices: [], lastId: 0 });
}

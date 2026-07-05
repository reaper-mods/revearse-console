export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method === 'POST') {
        const { image } = req.body;
        // Store screenshot temporarily
        global.latestScreenshot = image;
        return res.json({ success: true });
    }
    
    if (req.method === 'GET') {
        return res.json({ 
            screenshot: global.latestScreenshot || null 
        });
    }
}

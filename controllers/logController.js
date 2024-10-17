const logWatcher = require('../models/logWatcher');

async function handleConnection(ws, filePath) {
    logWatcher.addClient(ws);

    try {
        const lastLines = await logWatcher.getLastLines(10, filePath);
        ws.send(JSON.stringify({
            type: 'initial',
            lines: lastLines.split('\n')
        }));

        ws.on('close', () => {
            logWatcher.removeClient(ws);
        });
    } catch (error) {
        console.error(`Error handling connection: ${error}`);
    }
}

module.exports = {
    handleConnection
};
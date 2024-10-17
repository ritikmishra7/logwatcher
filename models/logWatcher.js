const fs = require('fs');
const readline = require('readline');


let logFile = '';
let lastPosition = 0;
const clients = new Set();

function setLogFile(file) {
    logFile = file;
}

function addClient(ws) {
    clients.add(ws);
}

function removeClient(ws) {
    clients.delete(ws);
}

function watchLog() {
    setInterval(() => {
        fs.stat(logFile, (err, stats) => {
            if (err) {
                console.error(`Error accessing log file: ${err}`);
                return;
            }

            if (stats.size < lastPosition) {
                lastPosition = 0; 
            }

            if (stats.size > lastPosition) {
                const stream = fs.createReadStream(logFile, {
                    start: lastPosition,
                    end: stats.size
                });

                let newContent = '';
                stream.on('data', (chunk) => {
                    newContent += chunk.toString();
                });

                stream.on('end', () => {
                    lastPosition = stats.size;
                    sendUpdates(newContent);
                });
            }
        });
    }, 1000);
}

function sendUpdates(content) {
    const message = JSON.stringify({ type: 'update', lines: content.split('\n') });
    clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
        }
    });
}

// function getLastLines(n) {
//     return new Promise((resolve, reject) => {
//         fs.readFile(logFile, 'utf8', (err, data) => {
//             if (err) {
//                 reject(err);
//                 return;
//             }
//             const lines = data.split('\n');
//             resolve(lines.slice(-n).join('\n'));
//         });
//     });
// }

// Function to get the last `n` lines from a large file
function getLastLines(n, filePath) {
    return new Promise((resolve, reject) => {
        // Get the file stats to determine its size
        fs.stat(filePath, (err, stats) => {
            if (err) {
                reject(err);
                return;
            }

            const fileSize = stats.size;
            const chunkSize = 64 * 1024;  // Read in chunks of 64KB
            let buffer = Buffer.alloc(chunkSize);
            let lines = [];
            let position = fileSize;
            let remainder = '';

            // Function to process the chunk
            const processChunk = () => {
                if (position <= 0) {
                    resolve(lines.slice(-n).join('\n'));
                    return;
                }

                const readPosition = Math.max(0, position - chunkSize);
                const toRead = Math.min(chunkSize, position);

                // Read the chunk
                fs.open(filePath, 'r', (err, fd) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    fs.read(fd, buffer, 0, toRead, readPosition, (err, bytesRead) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        // Add the chunk's data to the remainder
                        const chunk = buffer.slice(0, bytesRead).toString('utf8');
                        const combined = chunk + remainder;
                        const splitLines = combined.split('\n');
                        remainder = splitLines.shift();  // First line might be incomplete
                        lines = splitLines.concat(lines);

                        // If we have enough lines, resolve the result
                        if (lines.length >= n) {
                            resolve(lines.slice(-n).join('\n'));
                            return;
                        }

                        // Update position for the next read and continue
                        position -= chunkSize;
                        fs.close(fd, processChunk);
                    });
                });
            };

            processChunk();
        });
    });
}


module.exports = {
    setLogFile,
    addClient,
    removeClient,
    watchLog,
    getLastLines
};
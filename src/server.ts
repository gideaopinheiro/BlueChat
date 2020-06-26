import WebSocket from 'ws';
import uuid from 'node-uuid';

const WebSocketServer = WebSocket.Server;
const wss = new WebSocketServer({ port: 8181 });


interface Client {
    id: string,
    ws: WebSocket,
    nickname: string
}

let clientIdx = 1;
const clients: Client[] = [];
const allMessages: {user: string, message: string}[] = [];


wss.on('connection', (ws: WebSocket) => {
    const client_uuid = uuid.v4();
    let nickname = `AnonymousUser${clientIdx}`;
    clientIdx+=1;
    clients.push({ "id": client_uuid, "ws": ws, "nickname": nickname });
    
    console.log(`client ${client_uuid} conected`);

    sendToThis();

    ws.on('message', (message) => {
        const messageStr = String(message);

        if (messageStr.indexOf('/nick') == 0) {
            const nickname_array = messageStr.split(' ');

            if (nickname_array.length == 2) {
                const old_nickname = nickname;
                nickname = nickname_array[1];
                const nickname_message =
                        `Client ${old_nickname} changed to ${nickname}`;
                    
                const formatedMessage = {user: nickname, message: nickname_message};
                allMessages.push(formatedMessage);
                sendToAll(nickname, formatedMessage);
            }
            else {
                const invalidNickname = nickname_array.slice(1).toString().replace(',', ' ');
                const errorMessage = `'${invalidNickname}' has space(s)`;
                const formatedMessage = {user: client_uuid, message: errorMessage};
                console.log(`${invalidNickname} has space(s)`)
                ws.send(JSON.stringify({
                    "id": client_uuid,
                    "nickname": nickname,
                    "message": formatedMessage
                }))
            }
        } 
        else {
            const formatedMessage = {user: nickname, message: messageStr};
            allMessages.push(formatedMessage);
            sendToAll(nickname, formatedMessage);
        }
    });

    function sendToAll(nick: string, msg: any) {
        for (let i = 0; i < clients.length; i++) {
            const clientSocket = clients[i].ws;
            if (clientSocket.readyState == WebSocket.OPEN) {
                clientSocket.send(JSON.stringify({
                    "id": client_uuid,
                    "nickname": nick,
                    "message": msg
                }));
            }
        }
    }

    function sendToThis() {
        for (let i = 0; i < allMessages.length; i++) {
            ws.send(JSON.stringify({
                "id": client_uuid,
                "nickname": nickname,
                "message": allMessages[i]
            }));
        }
    }

    ws.on('close', () => {
        for (let i = 0; i < clients.length; i++) {
            if (clients[i].id == client_uuid) {
                console.log(`client ${nickname} disconnected`);
                clients.splice(i, 1);
            }
        }
    });
});


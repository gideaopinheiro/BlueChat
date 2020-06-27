import WebSocket from 'ws';
import uuid from 'node-uuid';

const WebSocketServer = WebSocket.Server;
const wss = new WebSocketServer({ port: 8181 });


interface Client {
    color: string,
    id: string,
    ws: WebSocket,
    nickname: string
}

const MStype = {
    NOTIFICATION: 'notification',
    MESSAGE: 'message',
    NICKNAME: 'nick_update'
};

const STATE = {
    ON: 'badge-success',
    OFF: 'badge-dark',
    INVISIBLE: 'badge-light',
    BUSY: 'badge-warning',
    ABSENT: 'badge-danger'
};

let clientIdx = 1;
const clients: Client[] = [];
const allMessages: {user: string, message: string}[] = [];
const colorsArray = ['badge-success', 'badge-danger'];

wss.on('connection', (ws: WebSocket) => {
    const client_uuid = uuid.v4();
    let nickname = `AnonymousUser${clientIdx}`;
    clients.push({ "color": colorsArray[clientIdx % colorsArray.length], "id": client_uuid, "ws": ws, "nickname": nickname });
    clientIdx+=1;
    
    const connectMessage = `client ${nickname} conected`
    console.log(connectMessage);

    sendToThis();
    if (allMessages.length > 0) sendToAll(MStype.NOTIFICATION, connectMessage);
 
    ws.on('message', (message) => {
        console.log(String(message));
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
                sendToAll(MStype.NICKNAME, formatedMessage);
            }
            else {
                const invalidNickname = nickname_array.slice(1).toString().replace(',', ' ');
                const errorMessage = `'${invalidNickname}' has space(s)`;
                const formatedMessage = {user: client_uuid, message: errorMessage};
                console.log(`${invalidNickname} has space(s)`)
                ws.send(JSON.stringify({
                    "type": MStype.NOTIFICATION,
                    "id": client_uuid,
                    "nickname": nickname,
                    "message": formatedMessage
                }));
            }
        } 
        else {
            const formatedMessage = {user: nickname, message: messageStr};
            allMessages.push(formatedMessage);
            sendToAll(MStype.MESSAGE, formatedMessage);
        }
    });

    let closeSocket = function userDisconnect(customMessage?: string) {
        for (let i = 0; i < clients.length; i++) {
            if (clients[i].id == client_uuid) {
                let disconnectMessage;
                if (customMessage) {
                    disconnectMessage = customMessage;
                } else {
                    disconnectMessage = `${nickname} has disconnected`;
                }
                const formatedMessage = {user: 'admin', message: disconnectMessage};
                sendToAll(MStype.NOTIFICATION, formatedMessage);
                clients.splice(i, 1);
            }
        }
    }

    function sendToAll(type: any, msg: any) {
        let color: string = '';
        for (let i = 0; i < clients.length; i++) {  
            if (client_uuid == clients[i].id){
                color = clients[i].color;
                break;
            }
        }

        for (let i = 0; i < clients.length; i++) {
            const clientSocket = clients[i].ws;
            if (clientSocket.readyState == WebSocket.OPEN) {
                clientSocket.send(JSON.stringify({
                    "color": color,
                    "type": type,
                    "id": client_uuid,
                    "nickname": nickname,
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
        closeSocket();
    });

    process.on('SIGINT', () => {
        console.log('Closing things');
        closeSocket('Server has disconnected');
        process.exit();
    });
});


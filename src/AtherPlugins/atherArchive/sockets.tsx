import { Channel, Message, User } from "discord-types/general";
import { LoggedMessageJSON } from "./types";

const fetchedArchive = {
    // id: { message }
} as any;

const randomGenId = function () {
    return Math.random().toString(36).substr(2, 9);
};

const idsWaiting = [] as { id: string, callback: (data: any) => void; }[];
function waitForId(id: string, callback: (data: any) => void) {
    idsWaiting.push({ id, callback });
}

function handleId(data: any) {
    for (let i = 0; i < idsWaiting.length; i++) {
        if (idsWaiting[i].id === data.id) {
            idsWaiting[i].callback(data);
            idsWaiting.splice(i, 1);
            return;
        }
    }
}

async function fetchArchive(id: string, ws: WebSocket) {
    const randGenId = randomGenId();
    if (fetchedArchive[id]) return fetchedArchive[id];
    return new Promise((resolve, reject) => {
        ws.send(JSON.stringify({
            type: "atherArchive",
            archiveType: "messages",
            action: "get",
            messageId: id,
            id: randGenId
        }));
        waitForId(randGenId, (data) => {
            fetchedArchive[id] = data;
            resolve(data);
        });
        return null;
    });
};


async function archiveChannel(channel: Channel, ws: WebSocket) {
    let type = "text";
    if (channel.type === 0) type = "GUILD_TEXT";
    if (channel.type === 1) type = "DM";
    if (channel.type === 2) type = "GUILD_VOICE";
    if (channel.type === 3) type = "GROUP_DM";
    if (channel.type === 4) type = "GUILD_CATEGORY";
    if (channel.type === 5) type = "GUILD_ANNOUNCEMENT";
    if (channel.type === 10) type = "ANNOUNCEMENT_THREAD";
    if (channel.type === 11) type = "PUBLIC_THREAD";
    if (channel.type === 12) type = "PRIVATE_THREAD";
    if (channel.type === 13) type = "GUILD_STAGE_VOICE";
    if (channel.type === 14) type = "GUILD_DIRECTORY";
    if (channel.type === 15) type = "GUILD_FORUM";
    if (channel.type === 16) type = "GUILD_MEDIA";
    let channelArch = {
        id: channel.id,
        name: channel.name,
        type,
        guild_id: channel.guild_id,
        is_voice: channel.type === 2,
        is_thread: channel.type === 10 || channel.type === 11 || channel.type === 12,
        latest_message_id: channel.lastMessageId
    };
    // console.log("archiving channel", channelArch);
    if (!ws) return;
    return new Promise((resolve, reject) => {
        ws.send(JSON.stringify({
            type: "atherArchive",
            action: "append",
            archiveType: "channels",
            data: channelArch
        }));
    });
}

async function archiveGuild(guild: object, ws: WebSocket) {
    if (!ws) return;
    // console.log('archiving guild', guild);
    return new Promise((resolve, reject) => {
        ws.send(JSON.stringify({
            type: "atherArchive",
            action: "append",
            archiveType: "guilds",
            data: guild
        }));
    });
}

const archivedMessages = [] as string[];
const archivedUsers = new Map() as Map<string, number>;


// data sent to websocket
// message, ws
async function archiveMessage(message: Message | LoggedMessageJSON | any, ws: WebSocket): Promise<any> {
    if (message.state === "SENDING") return console.log("attempted to archive sending message");
    if (archivedMessages.includes(message.id)) return;
    const id = randomGenId();
    return new Promise((resolve, reject) => {
        ws.send(JSON.stringify({
            type: "atherArchive",
            action: "append",
            archiveType: "messages",
            data: message,
            id
        }));
        waitForId(id, (data) => {
            resolve(data);
            archivedMessages.push(message.id);
        });
    });
};

async function archiveUser(user: any, ws: WebSocket) {
    const lastTime = archivedUsers.get(user.id) ?? 0;
    if (lastTime > Date.now()) return;
    const id = randomGenId();
    return new Promise((resolve, reject) => {
        ws.send(JSON.stringify({
            type: "atherArchive",
            action: "append",
            archiveType: "users",
            data: user,
            id
        }));
        waitForId(id, (data) => {
            resolve(data);
            archivedUsers.set(user.id, Date.now() + 30 * 1000);
        });
    });
}

async function bulkArchiveMessages(messages: Message[], ws: WebSocket) {
    // removes duplicates
    messages = messages.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
    // removes already archived messages
    messages = messages.filter((v) => !archivedMessages.includes(v.id));
    const id = randomGenId();
    return new Promise((resolve, reject) => {
        ws.send(JSON.stringify({
            type: "atherArchive",
            action: "appendBulk",
            archiveType: "messages",
            data: messages,
            id
        }));
        waitForId(id, (data) => {
            resolve(data);
            messages.forEach((message) => {
                archivedMessages.push(message.id);
            });
        });
    });
}

function archivedMessagesIncludes(id: string) {
    return archivedMessages.includes(id);
}

function fetchedArchiveAdd(id: string, data: any) {
    fetchedArchive[id] = data;
}


export { archiveMessage, bulkArchiveMessages, archiveChannel, archiveGuild, fetchArchive, archivedMessagesIncludes, handleId, waitForId, fetchedArchiveAdd, archiveUser };
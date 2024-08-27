import { addButton, removeButton } from "@api/MessagePopover";
import { addDecoration, removeDecoration } from "@api/MessageDecorations";
import ErrorBoundary from "@components/ErrorBoundary";
import { showNotification } from "@api/Notifications";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Toasts, GuildStore, React, useEffect, MessageStore, UserStore } from "@webpack/common";
import { definePluginSettings } from "@api/Settings";
import { Channel, Message, User } from "discord-types/general";
import { ChannelType } from "plugins/relationshipNotifier/types";
import { LoadMessagePayload, LoggedMessageJSON } from "./types";
import { archiveChannel, archiveGuild, archiveMessage, fetchArchive, archivedMessagesIncludes, handleId, fetchedArchiveAdd, archiveUser } from "./sockets";

const ArchiveIndicator = ({ user, wantMargin = true, wantTopMargin = false, small = false, archived, error }: { user: User; wantMargin?: boolean; wantTopMargin?: boolean; small?: boolean, archived: boolean; error: boolean; }) => {
    if (!user) return null;
    let icons = [] as any[];
    // checks archivedMessages, if it includes the message id, it will show the icon
    if (error)
        icons = [AtherIcon({ small, color: "#5f5f5f" })];
    else
        icons = [AtherIcon({ small, color: "#f61c19" })];
    if (archived) icons = [AtherIcon({ small, color: "#00a05b" })];

    if (!icons.length) return null;

    return (
        <span
            className="vc-platform-indicator"
            style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: wantMargin ? 4 : 0,
                verticalAlign: "top",
                position: "relative",
                top: wantTopMargin ? 2 : 0,
                padding: !wantMargin ? 1 : 0,
                gap: 2
            }}

        >
            {icons}
        </span>
    );
};

function AtherIcon({ small = false, color = "var(--header-secondary)" }: { small?: boolean; color?: string; }) {
    const size = small ? 10 : 16;
    return (
        <svg
            fill={color}
            width={size} height={size}
            viewBox={"0 0 64 64"}
        >
            <path d="M33.7,65.64a54.31,54.31,0,0,1-19.48,9.63L1,63A54.8,54.8,0,0,1,3.52,46.38a47.22,47.22,0,0,1,7.6-14.66A42.63,42.63,0,0,1,23.59,20.86a40.68,40.68,0,0,1,17.17-5.19l7.06,10.81a83.46,83.46,0,0,1,5.46-7.06l10.49,9A143.47,143.47,0,0,0,46.22,57.93l-.32.22a87.07,87.07,0,0,0,14.55-5.51q8.34-3.9,10.59-5.08l2.36,10.8q-6.32,4.61-21,11.88a99.37,99.37,0,0,1-10.48,4.6ZM15.94,59.86Q27.39,56.76,36.8,44.67A57.59,57.59,0,0,0,41,29.47a25.72,25.72,0,0,0-18.08,9.74Q15.93,47.78,15.94,59.86Z" transform="translate(-0.96 -15.67)" /><path d="M197.29,58m.8,16.21" transform="translate(-0.96 -15.67)" />
        </svg>
    );
};

const settings = definePluginSettings({
    atherkey: {
        description: "API Key",
        type: OptionType.STRING,
        default: "key",
    },
    archiveAll: {
        description: "Archives every mesasge you see",
        type: OptionType.BOOLEAN,
        default: false
    },
    showSymbol: {
        description: "Show the archive symbol",
        type: OptionType.BOOLEAN,
        default: true
    }
});

let authed = false;
let started = false;
let ws: WebSocket;
let conFailNotif = false;

const placeStuff = (atherIcon) => {
    addDecoration("archive-indicator", (props) => {
        if (!settings.store.showSymbol) return null;
        try {
            const [archived, setArchived] = React.useState<boolean>(false);

            useEffect(() => {
                const fetchArchiveData = async () => {
                    const archiveData = await fetchArchive(props.message.id, ws);
                    if (archiveData.status === "success")
                        setArchived(true);
                    else if (archiveData.status === "error") {
                        setArchived(false);
                    }
                };
                fetchArchiveData();
            }, []);

            return (
                <ErrorBoundary noop>
                    <ArchiveIndicator user={props.message?.author} wantTopMargin={true} archived={archivedMessagesIncludes(props.message.id) || archived} error={false} />
                </ErrorBoundary>
            );
        } catch (e) {
            return <ErrorBoundary noop>
                <ArchiveIndicator user={props.message?.author} wantTopMargin={true} archived={false} error={true} />
            </ErrorBoundary>;
        }
    });

    // popup
    addButton("ArchiveMessage", msg => {
        const channel = ChannelStore.getChannel(msg.channel_id);
        if (channel.guild_id) {
            archiveChannel(channel, ws);
            archiveGuild(GuildStore.getGuild(channel.guild_id), ws);
        }
        return {
            label: "Archive Message",
            icon: atherIcon,
            message: msg,
            channel,
            onClick: () => handleMessageArchive(
                msg
            )
        };
    });
};

function handleMessageArchive(d1: any) {
    const message = d1;
    let attachments = message.attachments.map(attachment => ({
        attachment: attachment.url,
        name: attachment.filename,
        id: attachment.id,
        size: attachment.size,
        url: attachment.url,
        proxyURL: attachment.proxy_url,
        height: attachment.height,
        width: attachment.width,
        contentType: attachment.content_type,
        description: null,
        ephemeral: false,
        duration: null,
        waveform: null,
        flags: 0
    }));
    const messageData = {
        id: message.id,
        type: message.type,
        channel_id: message.channel_id,
        author: message.author,
        content: message.content,
        attachments,
        embeds: message.embeds,
        pinned: message.pinned,
        mentionEveryone: message.mention_everyone || false,
        tts: message.tts,
        flags: message.flags,
        timestamp: Date.parse(message.timestamp)
    };
    archiveMessage(messageData, ws);
    return;
}

function handleUserArchive(d1: any) {
    const user = d1;
    const userData = {
        id: user.id,
        username: user.username,
        globalName: user.globalName ?? null,
        avatar: user.avatar,
        publicFlags: user.publicFlags ?? 0,
        clan: user.clan ?? null,
        bot: user.bot ?? false,
    };

    archiveUser(userData, ws);
    return;
}

const lastArchived: { timestamp: number, id: string; }[] = [];

function checkLastArchived(id) {
    const twentyFourHoursInMilliseconds = 24 * 60 * 60 * 1000;
    const index = lastArchived.findIndex(item => item.id === id);

    if (index !== -1) {
        const item = lastArchived[index];
        const twentyFourHoursAgo = Date.now() - twentyFourHoursInMilliseconds;

        if (item.timestamp < twentyFourHoursAgo) {
            lastArchived.splice(index, 1);
            return true; // Deleted item from array
        } else {
            return false; // Timestamp is from less than 24 hours ago
        }
    } else {
        return true; // ID doesn't exist in array
    }
}

export default definePlugin({
    name: "Ather Archive v2",
    description: "Where the Past Lives On, Forever Engraved in the Unforgettable Logs of Time.",
    authors: [{
        "id": 800246262175236137n,
        "name": "AngeLz"
    }],
    flux: {
        LOAD_MESSAGES_SUCCESS(dMany) {
            if (!settings.store.archiveAll) return;
            const channel = ChannelStore.getChannel(dMany.channelId);
            if (!channel.guild_id) return;
            dMany.messages.forEach((d1) => {
                handleMessageArchive(d1);
                handleUserArchive(d1.author);
            });
            if (checkLastArchived(dMany.channelId)) {
                lastArchived.push({ timestamp: Date.now(), id: dMany.channelId });
                archiveChannel(channel, ws);
                archiveGuild(GuildStore.getGuild(channel.guild_id), ws);
            }
        },
        MESSAGE_CREATE(d1: any) {
            if (!settings.store.archiveAll) return;
            if (!d1.guildId) return;
            // console.log("arching 1 message", [d1.message]);
            handleMessageArchive(d1.message);
            handleUserArchive(d1.message.author);
            if (checkLastArchived(d1.channelId)) {
                lastArchived.push({ timestamp: Date.now(), id: d1.channelId });
                const channel = ChannelStore.getChannel(d1.channelId);
                archiveChannel(channel, ws);
                archiveGuild(GuildStore.getGuild(d1.guildId), ws);
            }
        },
        PRESENCE_UPDATES(d1) {
            for (let i = 0; i < d1.updates.length; i++) {
                const user = d1.updates[i].user;
                const userData = UserStore.getUser(user.id);
                handleUserArchive(userData);
            }
        },
        USER_PROFILE_FETCH_SUCCESS(a) {
            const userData = UserStore.getUser(a.user.id);
            handleUserArchive(userData);
        },
    },
    resolveGuildChannels(channels: Record<string | number, Array<{ channel: Channel; comparator: number; }> | string | number>, shouldIncludeHidden: boolean) {
        console.log(channels);
        return channels;
    },
    // Delete these two below if you are only using code patches
    async start() {
        console.log("ather archive started");
        if (ws) ws.close();
        console.log("ather archive connecting.");
        ws = new WebSocket('wss://ather1.net/wss');
        authed = false;
        const apikey = settings.store.atherkey;
        const connectionSuccessful = await new Promise(res => setTimeout(() => res(ws.readyState === WebSocket.OPEN), 3000)); // check if open after 1s
        if (!connectionSuccessful) {
            if (!conFailNotif) {
                conFailNotif = true;
                Toasts.show({
                    message: `Ather Archive Connection Failed`,
                    type: Toasts.Type.FAILURE,
                    id: Toasts.genId()
                });
                showNotification({
                    title: "Ather Archive Warning",
                    body: "Connection Failed to connect!",
                    permanent: true,
                    noPersist: true,
                });
            }
            this.start();
            return;
        }
        conFailNotif = false;
        console.log("ather archive authenticating.");
        ws.send(JSON.stringify({
            type: "auth",
            token: apikey
        }));
        // starts a heartbeat
        let hb = setInterval(() => {
            ws.send("ping");
        }, 1000 * 30);
        ws.onclose = (e) => {
            clearInterval(hb);
            console.log("ather archive socket disconnected.");
            Toasts.show({
                message: `Ather Archive Disconnected`,
                type: Toasts.Type.FAILURE,
                id: Toasts.genId()
            });
            console.log('Socket is closed.', e.reason);
            this.start();
        };
        ws.onmessage = (event) => {
            if (!event.data) return;
            if (event.data === "pong") return;
            const data = JSON.parse(event.data);
            if (data.type === "auth") {
                if (data.status === "success") {
                    authed = true;
                    Toasts.show({
                        message: `Ather Archive Connected`,
                        type: Toasts.Type.SUCCESS,
                        id: Toasts.genId()
                    });
                } else if (data.status === "error") {
                    Toasts.show({
                        message: `Ather Archive Auth Error: ${data.data}`,
                        type: Toasts.Type.FAILURE,
                        id: Toasts.genId()
                    });
                }
            }

            if (data.type === "error") {
                console.log("ATHER ERROR", data);
            }

            if (data.type === "atherArchive") {
                // checks its id to see if somethings waiting
                handleId(data);
                if (data.action === "append") {
                    if (data.status === "error") {
                        // if its message already exists, ignore if auto archiving
                        if ((data.data === "Message already exists." || data.data === "User already exists.") && settings.store.archiveAll) return;
                        console.error("ATHER ARCHIVE ERROR", data.data);
                    }
                } else if (data.action === "get") {
                    if (data.status === "success") {
                        fetchedArchiveAdd(data.data.id, data.data);
                    }
                }
            }
            if (!authed) return;
            if (started) return;
            started = true;
            placeStuff(AtherIcon);
        };
    },
    stop() {
        console.log("ather archive disconnected.");
        removeButton("ArchiveMessage");
        ws?.close();
        authed = false;
        started = false;
    },
    atherIcon: () => <AtherIcon small={false} />,
    settings
});

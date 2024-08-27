/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Message, MessageAttachment, MessageJSON } from "discord-types/general";

export interface LoggedAttachment extends MessageAttachment {
}

export type RefrencedMessage = LoggedMessageJSON & { message_id: string; };
export interface LoggedMessageJSON extends Omit<LoggedMessage, "timestamp"> {
    timestamp: any;
    mention_everyone: boolean;
}

export interface LoggedMessage extends Message {
}

export interface MessageDeletePayload {
}

export interface MessageDeleteBulkPayload {
}


export interface MessageUpdatePayload {
}

export interface MessageCreatePayload {
}

export interface LoadMessagePayload {
    type: string;
    channelId: string;
    messages: LoggedMessageJSON[];
    isBefore: boolean;
    isAfter: boolean;
    hasMoreBefore: boolean;
    hasMoreAfter: boolean;
    limit: number;
    isStale: boolean;
}

export interface AttachmentData {
    messageId: string;
    attachmentId: string;
}

export type SavedImages = Record<string, AttachmentData>;

export type LoggedMessageIds = {
    // [channel_id: string]: message_id
    deletedMessages: Record<string, string[]>;
    editedMessages: Record<string, string[]>;
};

export type MessageRecord = { message: LoggedMessageJSON; };

export type LoggedMessages = LoggedMessageIds & { [message_id: string]: { message?: LoggedMessageJSON; }; };

export type GitValue = {
    value: any;
    stderr?: string;
    ok: true;
};

export type GitError = {
    ok: false;
    cmd: string;
    message: string;
    error: any;
};

export type GitResult = GitValue | GitError;
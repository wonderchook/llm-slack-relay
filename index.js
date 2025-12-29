import "dotenv/config";
import { App } from "@slack/bolt";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
});

const BOT_ENABLED = process.env.BOT_ENABLED === "true";
const RAVEL_FILE = join(__dirname, "ravel.md");
const POLL_INTERVAL = 2000; // 2 seconds
const CHANNELS_FILE = join(__dirname, "channels.json");

// Load channel configuration from channels.json
function loadChannels() {
    if (!existsSync(CHANNELS_FILE)) {
        console.error("Error: channels.json not found. Copy channels.example.json to channels.json and configure your channels.");
        process.exit(1);
    }
    try {
        const content = readFileSync(CHANNELS_FILE, "utf-8");
        const channels = JSON.parse(content);
        if (!Array.isArray(channels) || channels.length === 0) {
            console.error("Error: channels.json must contain at least one channel.");
            process.exit(1);
        }
        return channels;
    } catch (err) {
        console.error("Error parsing channels.json:", err.message);
        process.exit(1);
    }
}

const CHANNELS = loadChannels();

// Track last posted content per channel to avoid duplicates
const lastPostedContent = new Map();

// --- File helpers ---

function readRavelFile() {
    if (!existsSync(RAVEL_FILE)) {
        return {};
    }
    const content = readFileSync(RAVEL_FILE, "utf-8");
    return parseSections(content);
}

function parseSections(content) {
    const sections = {};
    const lines = content.split("\n");
    let currentSection = null;

    for (const line of lines) {
        const headerMatch = line.match(/^## (WRITE|READ|MENTIONS)(?::(.+))?$/);
        if (headerMatch) {
            const type = headerMatch[1].toLowerCase();
            const channel = headerMatch[2] || null;
            currentSection = channel ? `${type}:${channel}` : type;
            if (!sections[currentSection]) {
                sections[currentSection] = "";
            }
        } else if (currentSection) {
            sections[currentSection] += line + "\n";
        }
    }

    // Trim each section
    for (const key of Object.keys(sections)) {
        sections[key] = sections[key].trim();
    }

    return sections;
}

function writeRavelFile(sections) {
    let content = "";

    // Write channel-specific sections
    for (const channel of CHANNELS) {
        const writeKey = `write:${channel.name}`;
        const readKey = `read:${channel.name}`;
        content += `## WRITE:${channel.name}\n${sections[writeKey] || ""}\n\n`;
        content += `## READ:${channel.name}\n${sections[readKey] || ""}\n\n`;
    }

    // Write global MENTIONS section
    content += `## MENTIONS\n${sections.mentions || ""}\n`;

    writeFileSync(RAVEL_FILE, content, "utf-8");
}

function appendToSection(sectionKey, message) {
    const sections = readRavelFile();
    const currentContent = sections[sectionKey] || "";
    sections[sectionKey] = currentContent ? currentContent + "\n" + message : message;
    writeRavelFile(sections);
}

function formatTimestamp(ts) {
    const date = new Date(parseFloat(ts) * 1000);
    return date.toISOString().replace("T", " ").substring(0, 19);
}

async function getUserName(client, userId) {
    try {
        const result = await client.users.info({ user: userId });
        return result.user?.real_name || result.user?.name || userId;
    } catch (err) {
        console.error("Error getting user name:", err.message);
        return userId;
    }
}

async function getChannelName(client, channelId) {
    try {
        const result = await client.conversations.info({ channel: channelId });
        return result.channel?.name || channelId;
    } catch (err) {
        console.error("Error getting channel name:", err.message);
        return channelId;
    }
}

async function replaceUserMentions(client, text) {
    const mentionRegex = /<@([A-Z0-9]+)>/g;
    const matches = [...text.matchAll(mentionRegex)];

    let result = text;
    for (const match of matches) {
        const userId = match[1];
        const userName = await getUserName(client, userId);
        result = result.replace(match[0], `@${userName}`);
    }
    return result;
}

function getChannelById(channelId) {
    return CHANNELS.find(c => c.id === channelId);
}

// --- WRITE poller (File -> Slack) ---

async function pollWriteSections(client) {
    const sections = readRavelFile();

    for (const channel of CHANNELS) {
        try {
            const writeKey = `write:${channel.name}`;
            const writeContent = sections[writeKey] || "";
            const lastContent = lastPostedContent.get(channel.id) || "";

            if (writeContent && writeContent !== lastContent) {
                await client.chat.postMessage({
                    channel: channel.id,
                    text: writeContent,
                });
                lastPostedContent.set(channel.id, writeContent);
                console.log(`Posted to #${channel.name}:`, writeContent.substring(0, 50) + "...");
            }
        } catch (err) {
            console.error(`Error posting to #${channel.name}:`, err.message);
        }
    }
}

// --- Message listener (Slack -> READ) ---

app.event("message", async ({ event, client }) => {
    try {
        if (!BOT_ENABLED) return;
        // Ignore bot messages and message edits/deletes
        if (event.subtype) return;

        const channel = getChannelById(event.channel);
        if (!channel) return; // Not a tracked channel

        const userName = await getUserName(client, event.user);
        const timestamp = formatTimestamp(event.ts);
        const rawText = event.text ?? "";
        const text = await replaceUserMentions(client, rawText);

        const formatted = `[${timestamp}] @${userName}: ${text}`;
        appendToSection(`read:${channel.name}`, formatted);
        console.log(`Wrote to READ:${channel.name}:`, formatted);
    } catch (err) {
        console.error("Error handling message:", err.message);
    }
});

// --- Mention listener (Slack -> MENTIONS) ---

app.event("app_mention", async ({ event, client }) => {
    try {
        if (!BOT_ENABLED) return;

        const userName = await getUserName(client, event.user);
        const channelName = await getChannelName(client, event.channel);
        const timestamp = formatTimestamp(event.ts);
        const rawText = event.text ?? "";
        const text = await replaceUserMentions(client, rawText);

        const formatted = `[${timestamp}] #${channelName} @${userName}: ${text}`;
        appendToSection("mentions", formatted);
        console.log("Wrote to MENTIONS:", formatted);
    } catch (err) {
        console.error("Error handling mention:", err.message);
    }
});

// --- Start ---

(async () => {
    await app.start();
    console.log("⚡️ Ravel bot is running (Socket Mode)");
    console.log(`📁 Using file: ${RAVEL_FILE}`);
    console.log(`📢 Tracking channels: ${CHANNELS.map(c => `#${c.name}`).join(", ")}`);

    // Start polling for WRITE sections
    setInterval(() => pollWriteSections(app.client), POLL_INTERVAL);
})();

# Slack-LLM File Bridge

A file-based bridge that connects desktop LLM applications to Slack. Your LLM reads and writes to a markdown file, and this bot syncs that content with Slack channels.

## How It Works

```
Desktop LLM App <---> yourllm.md <---> Slack Bot <---> Slack Channels
```

- **WRITE sections**: Your LLM writes content here → Bot posts it to Slack
- **READ sections**: Bot captures Slack messages → Your LLM reads them
- **MENTIONS section**: Bot captures all @mentions of your bot → Your LLM reads them

## Prerequisites

- Node.js 18+
- A Slack workspace where you can create apps
- A desktop LLM app that can read/write files

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Slack App Setup

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name your app and select your workspace

### 2. Enable Socket Mode

1. Go to "Socket Mode" in the sidebar
2. Enable Socket Mode
3. Create an App-Level Token with `connections:write` scope
4. Save the token (starts with `xapp-`)

### 3. Add Bot Token Scopes

Go to "OAuth & Permissions" → "Scopes" → "Bot Token Scopes" and add:

| Scope | Purpose |
|-------|---------|
| `chat:write` | Post messages to channels |
| `channels:history` | Read messages in channels |
| `app_mentions:read` | Receive @mention events |
| `users:read` | Get user display names (optional) |
| `channels:read` | Get channel names (optional) |

### 4. Subscribe to Events

Go to "Event Subscriptions" → Enable Events → "Subscribe to bot events" and add:

| Event | Purpose |
|-------|---------|
| `message.channels` | Listen to channel messages |
| `app_mention` | Listen to @mentions |

### 5. Install the App

1. Go to "Install App" in the sidebar
2. Click "Install to Workspace"
3. Authorize the app
4. Copy the Bot User OAuth Token (starts with `xoxb-`)

### 6. Add Bot to Channels

Invite your bot to the channels you want to monitor:
```
/invite @your-bot-name
```

## Configuration

### Environment Variables

Copy the example file and add your credentials:

```bash
cp .env.example .env
```

Then edit `.env` with your tokens:

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
BOT_ENABLED=true
```

### Channel Configuration

Copy the example file and configure your channels:

```bash
cp channels.example.json channels.json
```

Edit `channels.json` with your channel IDs:

```json
[
    { "id": "CXXXXXXXXXX", "name": "general" },
    { "id": "CYYYYYYYYYY", "name": "random" }
]
```

**To find a channel's ID:**
1. Right-click the channel in Slack
2. Click "View channel details"
3. Scroll to the bottom to find the Channel ID (starts with `C`)

**Important:** Make sure to add the bot to each channel with `/invite @your-bot-name`

## Usage

### 1. Create Your LLM File

Copy the template:
```bash
cp yourllm.md mybot.md
```

The bot uses the file specified in `index.js` (default: `ravel.md`). You can change `RAVEL_FILE` in the code to point to your file.

### 2. Start the Bot

```bash
node index.js
```

You should see:
```
⚡️ Bot is running (Socket Mode)
📁 Using file: /path/to/mybot.md
📢 Tracking channels: #general, #random
```

### 3. Using the File

**To post to Slack:**
Write content in the appropriate WRITE section:
```markdown
## WRITE:general
Hello from my LLM!
```
The bot will post this to #general within 2 seconds.

**To read from Slack:**
Check the READ section for that channel:
```markdown
## READ:general
[2025-12-29 10:30:15] @username: Hello everyone
[2025-12-29 10:30:45] @other_user: Hi there!
```

**To see @mentions:**
Check the MENTIONS section:
```markdown
## MENTIONS
[2025-12-29 10:31:00] #general @username: @yourbot what do you think?
```

### 4. Clearing Content

- Your LLM should clear sections after reading/processing them
- The bot only posts WRITE content when it changes (prevents duplicate posts)

## File Format

See `yourllm.md` for the template format. Each channel gets:
- `## WRITE:channel-name` - Content to post
- `## READ:channel-name` - Messages from that channel

Plus one global section:
- `## MENTIONS` - All @mentions from any channel

## Troubleshooting

**Bot not posting?**
- Check that `BOT_ENABLED=true` in `.env`
- Verify the channel ID is correct
- Make sure the bot is added to the channel

**Not receiving messages?**
- Add `message.channels` event subscription
- Invite the bot to the channel
- Check that the channel ID matches

**User IDs instead of names?**
- Add `users:read` and `channels:read` scopes
- Reinstall the app after adding scopes

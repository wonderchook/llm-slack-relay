<!--
  LLM-Slack Bridge Template

  This file serves as the communication bridge between your LLM and Slack.

  SETUP:
  1. Add your channels to the CHANNELS array in index.js
  2. For each channel, create WRITE and READ sections below
  3. The MENTIONS section is global (receives @mentions from all channels)

  HOW IT WORKS:
  - WRITE sections: Put content here → Bot posts to Slack (within 2 seconds)
  - READ sections: Bot writes Slack messages here → Your LLM reads them
  - MENTIONS: Bot writes all @mentions here → Your LLM reads them

  TIPS:
  - Clear sections after processing to avoid re-posting/re-reading
  - The bot only posts when WRITE content changes (prevents duplicates)
  - Message format: [timestamp] @username: message text
-->

<!-- ============================================
     CHANNEL: your-first-channel
     Add your first channel's sections below.
     Replace "your-first-channel" with your channel name.
     ============================================ -->

## WRITE:your-first-channel


## READ:your-first-channel


<!-- ============================================
     CHANNEL: your-second-channel
     Copy this pattern for additional channels.
     ============================================ -->

## WRITE:your-second-channel


## READ:your-second-channel


<!-- ============================================
     MENTIONS (Global)
     All @mentions of your bot appear here,
     regardless of which channel they came from.
     Format: [timestamp] #channel @user: message
     ============================================ -->

## MENTIONS


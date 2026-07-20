<div align="center" style="background: radial-gradient(circle at 78% -8%, rgba(59,158,243,0.13), transparent 30rem), radial-gradient(circle at -8% 38%, rgba(48,120,180,0.10), transparent 32rem), #080C15; padding: 56px 40px; border-radius: 20px; margin: 0 0 30px 0; box-shadow: 0 24px 80px rgba(0,0,0,0.42); border: 1px solid #1C2A38;">
  <div style="display: inline-flex; align-items: center; gap: 0.6em; margin-bottom: 22px;">
    <span style="display: inline-block; width: 2.2rem; height: 2.2rem; border-radius: 50%; border: 1px solid rgba(142,199,255,0.62); background: radial-gradient(circle at 34% 28%, #EEF3F7 0 7%, #AAB8C6 8% 17%, #3078B4 34% 60%, #080C15 71%); box-shadow: 0 0 28px rgba(59,158,243,0.25);"></span>
    <span style="color: #EEF3F7; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase; font-size: 1.05em;">Ward Tech Systems</span>
  </div>
  <div style="font-family: 'Courier New', monospace; color: #8EC7FF; font-size: 0.72em; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 14px;">— Social Publishing Engine —</div>
  <h1 style="margin: 0 0 18px 0; font-size: 3em; font-weight: 900; letter-spacing: -0.03em; text-transform: uppercase; line-height: 1.02; color: #EEF3F7;">Schedule Everything.<br /><span style="color: #3B9EF3;">Caption It With AI.</span></h1>
  <p style="max-width: 640px; margin: 0 auto 28px auto; color: #AAB8C6; font-size: 1.08em; line-height: 1.6;">Ward Tech Systems' internally-built AI Caption workflow, running on top of an AGPL-3.0 open-source scheduling core — self-hosted, 28+ channels, no vendor lock-in.</p>
  <div style="display: inline-flex; gap: 14px; flex-wrap: wrap; justify-content: center;">
    <a href="https://wardtechsystems.com" style="text-decoration: none; padding: 10px 22px; border-radius: 999px; background: #3078B4; color: #EEF3F7; font-weight: 700; font-size: 0.85em;">wardtechsystems.com</a>
    <a href="#ai-caption" style="text-decoration: none; padding: 10px 22px; border-radius: 999px; border: 1px solid #3078B4; color: #8EC7FF; font-weight: 700; font-size: 0.85em;">✨ See AI Caption</a>
    <a href="https://opensource.org/license/agpl-v3" style="text-decoration: none; padding: 10px 22px; border-radius: 999px; border: 1px solid #1C2A38; color: #AAB8C6; font-weight: 700; font-size: 0.85em;">AGPL-3.0</a>
  </div>
</div>

# Intro

- Ward Tech Systems fork, built for internal social publishing with an AI captioning layer on top.
- Schedule all your social media posts.
- Measure your work with analytics.
- Collaborate with team members to comment, exchange, and schedule posts.
- Perfect for automation (API) with platforms like N8N, Make.com, Zapier, etc.
- Underlying scheduling core is the open-source <a href="https://github.com/gitroomhq/postiz-app">Postiz</a> project (AGPL-3.0) — see its docs for the full self-host [Quick Start Guide](https://docs.postiz.com/quickstart).

## Tech Stack

- Pnpm workspaces (Monorepo)
- NextJS (React)
- NestJS
- Prisma (Default to PostgreSQL)
- Temporal
- Resend (email notifications)

<a name="ai-caption"></a>
## ✨ AI Caption — Ward Tech Systems Addition

<div style="background: #080C15; padding: 25px; border-radius: 14px; border-left: 4px solid #3078B4; margin: 20px 0;">
  <strong style="color: #3B9EF3;">🛠️ What Ward Tech Systems added:</strong> <span style="color: #EEF3F7;">a one-click <strong>AI Caption</strong> button in the post editor that turns any uploaded photo into a ready-to-post caption — no copywriting required.</span>
</div>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="width: 33%; vertical-align: top; padding: 16px; background: #0D1622; border-radius: 10px 0 0 10px; border: 1px solid #1C2A38;">
      <div style="font-weight: 700; color: #3B9EF3;">1. See</div>
      <div style="color: #AAB8C6; font-size: 0.92em; margin-top: 6px;">A vision model (OpenAI, or local Ollama) looks at the uploaded photo and writes a factual description.</div>
    </td>
    <td style="width: 33%; vertical-align: top; padding: 16px; background: #0D1622; border: 1px solid #1C2A38; border-left: none; border-right: none;">
      <div style="font-weight: 700; color: #3B9EF3;">2. Write</div>
      <div style="color: #AAB8C6; font-size: 0.92em; margin-top: 6px;">A text model (DeepSeek, or local Ollama) turns that description into headline, hook, bullets, closer, hashtags.</div>
    </td>
    <td style="width: 33%; vertical-align: top; padding: 16px; background: #0D1622; border-radius: 0 10px 10px 0; border: 1px solid #1C2A38;">
      <div style="font-weight: 700; color: #3B9EF3;">3. Post</div>
      <div style="color: #AAB8C6; font-size: 0.92em; margin-top: 6px;">The caption drops straight into the launch editor, branded via <code>CAPTION_BRAND_NAME</code>.</div>
    </td>
  </tr>
</table>

Configuration (all optional — falls back to local Ollama with sensible defaults):

| Env var | Purpose | Default |
|---|---|---|
| `OLLAMA_URL` | Local Ollama endpoint | `http://localhost:11434` |
| `OLLAMA_VISION_MODEL` | Vision model for image description | `qwen2.5vl:32b` |
| `OLLAMA_TEXT_MODEL` | Text model for caption generation | same as vision model |
| `OPENAI_API_KEY` / `OPENAI_VISION_MODEL` | Use OpenAI instead of local Ollama for vision | — |
| `DEEPSEEK_API_KEY` | Use DeepSeek instead of local Ollama for caption text | — |
| `CAPTION_BRAND_NAME` | Brand name inserted into the caption | `Ward Tech Systems` |
| `CAPTION_BRAND_TAGLINE` | Tagline appended to the caption | `AI-Powered Social Captions` |

Backend: `POST /media/:id/ai-caption` (`libraries/nestjs-libraries/src/database/prisma/media/media.service.ts`). Frontend: `apps/frontend/src/components/new-launch/ai.caption.button.tsx`.

## Quick Start

To have the project up and running, please follow the [Quick Start Guide](https://docs.postiz.com/quickstart)

## Compliance

- Self-hosted social media scheduling tool supporting platforms like X (formerly Twitter), Bluesky, Mastodon, Discord, and others.
- Uses official, platform-approved OAuth flows.
- Does not automate or scrape content from social media platforms.
- Does not collect, store, or proxy API keys or access tokens from users.
- Users always authenticate directly with the social platform, ensuring platform compliance and data privacy.

## License

This repository's source code is available under the [AGPL-3.0 license](LICENSE), inherited from the upstream <a href="https://github.com/gitroomhq/postiz-app">Postiz</a> project.

<p align="center" style="margin-top: 20px;">
  <sub style="color: #AAB8C6;">Ward Tech Systems · <a href="https://wardtechsystems.com" style="color: #3078B4;">wardtechsystems.com</a></sub>
</p>

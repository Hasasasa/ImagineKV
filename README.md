# ImagineKV

Video introduction:

- YouTube: https://youtu.be/pf0JESYm2gc
- Bilibili: https://www.bilibili.com/video/BV1wfrVB1E3T

[中文说明 / README.zh-CN](README.zh-CN.md)

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open: `http://localhost:3000`

## API Configuration

Open the top-right **API Configuration** button to set:

- **Request Mode**: Official / Third Party
- **Third Party Protocol** (when using Third Party):
  - **Gemini Native**: `.../v1beta/models/*:generateContent`
  - **OpenAI Format**: `.../v1/*` (e.g. OneAPI / OpenRouter compatible endpoints)
- **API Key** and **Base URL / Third-party URL**
- **Test** button to validate connectivity

Notes:

- OpenAI-format providers often require paths like `https://openrouter.ai/api` (not just `https://openrouter.ai`).
- Some providers block browser requests via CORS; in that case you need a server-side proxy.

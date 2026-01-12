# ImagineKV

[English / README](README.md)

## 本地运行

**环境要求：** Node.js 18+

1. 安装依赖：`npm install`
2. 启动开发环境：`npm run dev`
3. 打开：`http://localhost:3000`

## API 配置说明

点击右上角 **API 服务配置**，可以设置：

- **请求模式**：官方 / 第三方
- **第三方协议**（仅第三方模式可选）：
  - **Gemini 原生**：`.../v1beta/models/*:generateContent`
  - **OpenAI 格式**：`.../v1/*`（例如 OneAPI / OpenRouter 这类兼容接口）
- **API Key** 以及 **Base URL / 第三方网址**
- **测试** 按钮：用于检查当前配置是否可用

注意事项：

- OpenAI 格式的服务很多需要带 `api` 路径，例如 OpenRouter 应填写 `https://openrouter.ai/api`（而不是 `https://openrouter.ai`）。
- 部分第三方会限制浏览器跨域（CORS），这时前端直连会失败，需要你自己加一个后端/反向代理来转发请求。


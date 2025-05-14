# Quick Setup Guide

For full documentation, see [README.md](./README.md).

## TL;DR Setup

### 1. Install Dependencies
```bash
npm install
cd server && npm install && cd ..
```

### 2. Google Cloud Console
1. Create project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Search Console API**
3. Create OAuth credentials (Chrome Extension type)
4. Copy Client ID

### 3. Configure
```bash
# Update manifest.json with your Client ID
"oauth2": {
  "client_id": "YOUR_ID.apps.googleusercontent.com",
  ...
}

# Create server/.env
echo "GEMINI_API_KEY=your-key-here" > server/.env
```

### 4. Build & Run
```bash
# Terminal 1: Build extension
npm run build

# Terminal 2: Run server
cd server && npm run dev
```

### 5. Load Extension
1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → select `dist/` folder
4. Copy Extension ID → update Google Cloud OAuth

---

## Quick Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build extension to `dist/` |
| `npm run dev` | Watch mode (UI preview) |
| `cd server && npm run dev` | Run backend server |

## Environment Variables

**Server (`server/.env`):**
```
GEMINI_API_KEY=your-gemini-api-key
PORT=3001
```

## Need Help?

See the full [README.md](./README.md) for:
- Detailed setup instructions
- Architecture explanation
- Deployment options
- Troubleshooting guide

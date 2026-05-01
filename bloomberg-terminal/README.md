# Bloomberg Terminal — Local Setup (Mac)

## Prerequisites

Install Node.js if you don't have it:
1. Go to https://nodejs.org
2. Download the **LTS** version
3. Run the installer — click through all the defaults

To verify it worked, open **Terminal** (Cmd+Space → type "Terminal" → Enter) and run:
```
node --version
```
You should see something like `v20.x.x`.

---

## Setup (one time only)

Open Terminal and run these commands **one at a time**:

```bash
# 1. Go to the project folder (adjust path if you saved it elsewhere)
cd ~/Downloads/bloomberg-terminal

# 2. Install dependencies
npm install
```

That's it for setup.

---

## Running the terminal

Every time you want to start it:

```bash
cd ~/Downloads/bloomberg-terminal
npm run dev
```

Then open your browser and go to: **http://localhost:5173**

Press `Ctrl+C` in Terminal to stop it.

---

## API Key

On first launch you'll see a login screen asking for your Anthropic API key.

1. Go to https://console.anthropic.com
2. Sign up / log in
3. Click **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)
5. Paste it into the terminal login screen and click **CONNECT**

Your key is saved in your browser's local storage — you won't need to enter it again.

To disconnect / change your key, click **DISCONNECT** in the top-right corner of the terminal.

---

## Features

- **Live price simulation** — equities, forex, commodities, bonds update every 3 seconds
- **Ticker tape** — scrolling price feed across the top
- **AI news feed** — click "REFRESH FEED" to generate fresh financial headlines
- **AI analysis** — click any headline to get a Bloomberg-style analyst writeup
- **Sparkline charts** — mini price history charts on each equity

---

## Troubleshooting

**`npm: command not found`** → Node.js isn't installed. See Prerequisites above.

**Port already in use** → Run `npm run dev -- --port 3000` to use a different port.

**API key error** → Make sure you copied the full key starting with `sk-ant-`. Check you have credits at console.anthropic.com.

**Blank screen** → Open browser DevTools (Cmd+Option+I) → Console tab to see any errors.

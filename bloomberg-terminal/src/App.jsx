import { useState, useEffect, useCallback, useRef } from "react";

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0a", panel: "#111111", border: "#2a2a2a",
  orange: "#ff6600", yellow: "#ffcc00", green: "#00cc44",
  red: "#ff3333", blue: "#3399ff", cyan: "#00cccc",
  white: "#e8e8e8", muted: "#555555", label: "#888888",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n, dec = 2) =>
  n == null ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const pct = (n) => n == null ? "—" : `${n >= 0 ? "+" : ""}${fmt(n)}%`;
const clr = (v) => v == null ? C.white : v >= 0 ? C.green : C.red;
const jitter = (v, p = 0.001) => v + v * (Math.random() - 0.5) * 2 * p;

// ── Seed Data ─────────────────────────────────────────────────────────────────
const EQUITIES_SEED = [
  { sym: "AAPL",  name: "Apple Inc",       price: 214.24, chg: 1.23  },
  { sym: "MSFT",  name: "Microsoft Corp",  price: 421.90, chg: -0.45 },
  { sym: "NVDA",  name: "NVIDIA Corp",     price: 877.35, chg: 3.12  },
  { sym: "GOOGL", name: "Alphabet Inc",    price: 174.12, chg: 0.88  },
  { sym: "AMZN",  name: "Amazon.com",      price: 193.61, chg: -1.02 },
  { sym: "META",  name: "Meta Platforms",  price: 512.77, chg: 2.34  },
  { sym: "TSLA",  name: "Tesla Inc",       price: 174.48, chg: -3.21 },
  { sym: "JPM",   name: "JPMorgan Chase",  price: 233.10, chg: 0.56  },
];

const FX_SEED = [
  { pair: "EUR/USD", rate: 1.0823, chg: 0.12  },
  { pair: "GBP/USD", rate: 1.2714, chg: -0.08 },
  { pair: "USD/JPY", rate: 157.34, chg: 0.31  },
  { pair: "USD/CHF", rate: 0.9012, chg: -0.14 },
  { pair: "AUD/USD", rate: 0.6431, chg: 0.22  },
  { pair: "USD/CAD", rate: 1.3812, chg: -0.09 },
];

const CMDTY_SEED = [
  { name: "Gold",        sym: "XAU/USD", price: 2342.10, chg: 0.87  },
  { name: "Silver",      sym: "XAG/USD", price: 28.43,   chg: 1.23  },
  { name: "Crude Oil",   sym: "WTI",     price: 82.14,   chg: -0.54 },
  { name: "Brent",       sym: "BRENT",   price: 86.21,   chg: -0.41 },
  { name: "Natural Gas", sym: "NG",      price: 2.187,   chg: 2.10  },
  { name: "Copper",      sym: "HG",      price: 4.512,   chg: 0.33  },
];

const BONDS_SEED = [
  { name: "US 2Y",  yld: 4.832, chg: -0.021 },
  { name: "US 5Y",  yld: 4.541, chg: -0.014 },
  { name: "US 10Y", yld: 4.612, chg: -0.008 },
  { name: "US 30Y", yld: 4.773, chg:  0.003 },
  { name: "DE 10Y", yld: 2.543, chg: -0.011 },
  { name: "JP 10Y", yld: 0.882, chg:  0.014 },
];

const MACRO = [
  { name: "US GDP (Q4)",     value: "2.8%",  prev: "3.1%",  delta: -0.3 },
  { name: "US CPI (Mar)",    value: "3.5%",  prev: "3.2%",  delta:  0.3 },
  { name: "US Unemployment", value: "3.9%",  prev: "3.7%",  delta:  0.2 },
  { name: "Fed Funds Rate",  value: "5.50%", prev: "5.50%", delta:  0.0 },
  { name: "EU CPI (Mar)",    value: "2.4%",  prev: "2.6%",  delta: -0.2 },
  { name: "UK GDP (Q4)",     value: "0.1%",  prev: "-0.1%", delta:  0.2 },
  { name: "China PMI (Mar)", value: "51.1",  prev: "49.1",  delta:  2.0 },
  { name: "Japan CPI (Mar)", value: "2.7%",  prev: "2.8%",  delta: -0.1 },
];

// ── API Key Gate ──────────────────────────────────────────────────────────────
function ApiKeyGate({ onKey }) {
  const [val, setVal] = useState(() => localStorage.getItem("bbg_api_key") || "");
  const [err, setErr] = useState("");
  const [testing, setTesting] = useState(false);

  const handleSubmit = async () => {
    if (!val.startsWith("sk-ant-")) {
      setErr("Key should start with sk-ant-…");
      return;
    }
    setTesting(true);
    setErr("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": val, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 10, messages: [{ role: "user", content: "hi" }] }),
      });
      if (res.ok) {
        localStorage.setItem("bbg_api_key", val);
        onKey(val);
      } else {
        const j = await res.json();
        setErr(j.error?.message || "Invalid API key");
      }
    } catch {
      setErr("Network error — check your connection");
    }
    setTesting(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "monospace",
    }}>
      <div style={{ width: 480, border: `1px solid ${C.orange}`, background: C.panel }}>
        {/* Header */}
        <div style={{ background: C.orange, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: 4, color: "#000" }}>BLOOMBERG</span>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: 2, color: "#000" }}>TERMINAL</span>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ color: C.yellow, fontSize: 13, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>
            ANTHROPIC API KEY REQUIRED
          </div>
          <div style={{ color: C.label, fontSize: 11, lineHeight: 1.7, marginBottom: 20 }}>
            The AI-powered news feed requires an Anthropic API key.<br />
            Get one free at{" "}
            <a href="https://console.anthropic.com" target="_blank" rel="noreferrer"
              style={{ color: C.orange }}>console.anthropic.com</a>
            <br />
            Your key is stored locally in your browser and never sent anywhere except Anthropic.
          </div>

          <input
            type="password"
            placeholder="sk-ant-api03-..."
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%", background: "#0a0a0a", border: `1px solid ${C.border}`,
              color: C.white, fontFamily: "monospace", fontSize: 12,
              padding: "10px 12px", marginBottom: 12, outline: "none",
            }}
          />

          {err && (
            <div style={{ color: C.red, fontSize: 11, marginBottom: 10 }}>⚠ {err}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={testing || !val}
            style={{
              width: "100%", background: testing || !val ? "#333" : C.orange,
              color: testing || !val ? C.muted : "#000",
              border: "none", cursor: testing || !val ? "not-allowed" : "pointer",
              fontFamily: "monospace", fontSize: 12, fontWeight: 800,
              padding: "10px", letterSpacing: 2,
            }}
          >
            {testing ? "VERIFYING..." : "CONNECT →"}
          </button>

          <div style={{ color: C.muted, fontSize: 10, marginTop: 12, textAlign: "center" }}>
            Press Enter or click CONNECT to authenticate
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Spark({ data, color: c }) {
  if (!data || data.length < 2) return null;
  const w = 72, h = 22;
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={c} strokeWidth="1.5" />
    </svg>
  );
}

// ── Clock ─────────────────────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <span style={{ fontFamily: "monospace", color: C.yellow, fontSize: 12 }}>
      {t.toUTCString().replace(" GMT", " UTC")}
    </span>
  );
}

// ── Ticker Tape ───────────────────────────────────────────────────────────────
function Ticker({ equities }) {
  const txt = equities.map(e => `${e.sym}  ${fmt(e.price)}  ${pct(e.chg)}`).join("     ◆     ");
  return (
    <div style={{ background: "#150800", borderBottom: `1px solid ${C.orange}`, overflow: "hidden", height: 24, display: "flex", alignItems: "center" }}>
      <style>{`@keyframes tick { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      <div style={{ animation: "tick 50s linear infinite", whiteSpace: "nowrap" }}>
        {[txt, txt].map((s, i) => (
          <span key={i} style={{ fontFamily: "monospace", fontSize: 11, color: C.orange, letterSpacing: 1 }}>
            {s}&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
function Panel({ title, badge, children, style }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden", ...style }}>
      <div style={{ background: "#181818", borderBottom: `1px solid ${C.border}`, padding: "4px 10px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ color: C.orange, fontFamily: "monospace", fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>{title}</span>
        {badge && <span style={{ background: C.orange, color: "#000", fontSize: 9, fontWeight: 800, padding: "1px 5px", letterSpacing: 1 }}>{badge}</span>}
        <span style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 5px ${C.green}` }} />
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
    </div>
  );
}

// ── Shared table cell components ──────────────────────────────────────────────
const TH = ({ children, left }) => (
  <th style={{ padding: "3px 10px", textAlign: left ? "left" : "right", fontWeight: 400, color: C.muted, fontSize: 10, letterSpacing: 1, borderBottom: `1px solid ${C.border}` }}>
    {children}
  </th>
);
const TD = ({ children, c, left }) => (
  <td style={{ padding: "4px 10px", color: c || C.white, textAlign: left ? "left" : "right", fontFamily: "monospace", fontSize: 11 }}>
    {children}
  </td>
);
const TR = ({ children }) => <tr style={{ borderBottom: `1px solid #181818` }}>{children}</tr>;

// ── Market Panels ─────────────────────────────────────────────────────────────
function EquitiesPanel({ data }) {
  return (
    <Panel title="EQUITIES" badge="NYSE·NASDAQ">
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace" }}>
        <thead><tr><TH left>SYM</TH><TH left>NAME</TH><TH>PRICE</TH><TH>CHG%</TH><TH>SPARK</TH></tr></thead>
        <tbody>
          {data.map(e => (
            <TR key={e.sym}>
              <TD c={C.yellow} left>{e.sym}</TD>
              <TD c={C.label} left>{e.name}</TD>
              <TD>{fmt(e.price)}</TD>
              <TD c={clr(e.chg)}>{pct(e.chg)}</TD>
              <td style={{ padding: "4px 10px", textAlign: "right" }}><Spark data={e.spark} color={clr(e.chg)} /></td>
            </TR>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function FXPanel({ data }) {
  return (
    <Panel title="FOREX" badge="SPOT">
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace" }}>
        <thead><tr><TH left>PAIR</TH><TH>RATE</TH><TH>CHG%</TH></tr></thead>
        <tbody>
          {data.map(f => (
            <TR key={f.pair}>
              <TD c={C.cyan} left>{f.pair}</TD>
              <TD>{fmt(f.rate, 4)}</TD>
              <TD c={clr(f.chg)}>{pct(f.chg)}</TD>
            </TR>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function CmdtyPanel({ data }) {
  return (
    <Panel title="COMMODITIES" badge="SPOT">
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace" }}>
        <thead><tr><TH left>NAME</TH><TH>SYM</TH><TH>PRICE</TH><TH>CHG%</TH></tr></thead>
        <tbody>
          {data.map(c => (
            <TR key={c.sym}>
              <TD left>{c.name}</TD>
              <TD c={C.muted}>{c.sym}</TD>
              <TD c={C.yellow}>${fmt(c.price)}</TD>
              <TD c={clr(c.chg)}>{pct(c.chg)}</TD>
            </TR>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function BondsPanel({ data }) {
  return (
    <Panel title="FIXED INCOME" badge="YIELDS">
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace" }}>
        <thead><tr><TH left>TENOR</TH><TH>YIELD</TH><TH>Δ(bp)</TH></tr></thead>
        <tbody>
          {data.map(b => (
            <TR key={b.name}>
              <TD c={C.blue} left>{b.name}</TD>
              <TD>{fmt(b.yld, 3)}%</TD>
              <TD c={clr(-b.chg)}>{b.chg >= 0 ? "+" : ""}{(b.chg * 100).toFixed(1)}</TD>
            </TR>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function MacroPanel() {
  return (
    <Panel title="MACRO">
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace" }}>
        <thead><tr><TH left>INDICATOR</TH><TH>NOW</TH><TH>PREV</TH><TH>Δ</TH></tr></thead>
        <tbody>
          {MACRO.map(m => (
            <TR key={m.name}>
              <TD c={C.label} left>{m.name}</TD>
              <TD c={C.yellow}>{m.value}</TD>
              <TD c={C.muted}>{m.prev}</TD>
              <TD c={clr(m.delta)}>{m.delta === 0 ? "—" : `${m.delta > 0 ? "+" : ""}${m.delta}`}</TD>
            </TR>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

// ── News Panel ────────────────────────────────────────────────────────────────
function NewsPanel({ apiKey }) {
  const [headlines, setHeadlines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const didFetch = useRef(false);

  const apiCall = useCallback(async (messages, maxTokens = 1000) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        messages,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "API error");
    return json.content?.find(b => b.type === "text")?.text || "";
  }, [apiKey]);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setHeadlines([]);
    setSelected(null);
    setDetail("");
    try {
      const text = await apiCall([{
        role: "user",
        content: `You are a financial news wire. Generate 8 realistic financial news headlines covering equities, Fed policy, forex, commodities, and bonds for today. Return ONLY a raw JSON array (no markdown, no explanation) with objects: { "time": "HH:MM", "category": "EQUITIES|FED|FOREX|COMMODITIES|BONDS", "headline": "max 90 chars", "sentiment": "positive|negative|neutral" }`,
      }]);
      setHeadlines(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch (e) {
      setHeadlines([{ time: "ERR", category: "SYS", headline: `Error: ${e.message}`, sentiment: "neutral" }]);
    }
    setLoading(false);
  }, [apiCall]);

  useEffect(() => {
    if (!didFetch.current) { didFetch.current = true; fetchNews(); }
  }, [fetchNews]);

  const fetchDetail = async (h) => {
    if (selected === h && detail) return;
    setSelected(h);
    setDetail("");
    setDetailLoading(true);
    try {
      const text = await apiCall([{
        role: "user",
        content: `You are a Bloomberg terminal analyst. Write a tight 3-paragraph analysis (plain text, no markdown) for: "${h.headline}". Cover: what happened, market implications, what to watch next.`,
      }]);
      setDetail(text);
    } catch (e) {
      setDetail(`Analysis unavailable: ${e.message}`);
    }
    setDetailLoading(false);
  };

  const catColor = (c) => ({ EQUITIES: C.yellow, FED: C.orange, FOREX: C.cyan, COMMODITIES: "#cc9900", BONDS: C.blue })[c] || C.white;
  const sentDot = (s) => s === "positive" ? C.green : s === "negative" ? C.red : C.muted;

  return (
    <Panel title="NEWS & ANALYSIS" badge="AI-POWERED" style={{ height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>
        {/* Headlines */}
        <div style={{ borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "5px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <button
              onClick={fetchNews}
              disabled={loading}
              style={{
                background: loading ? "#333" : C.orange, color: loading ? C.muted : "#000",
                border: "none", cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "monospace", fontSize: 10, fontWeight: 800,
                padding: "3px 12px", letterSpacing: 1,
              }}
            >
              {loading ? "FETCHING..." : "↺  REFRESH FEED"}
            </button>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {loading && (
              <div style={{ padding: 20, color: C.muted, fontFamily: "monospace", fontSize: 11, textAlign: "center" }}>
                Fetching market intelligence...
              </div>
            )}
            {headlines.map((h, i) => (
              <div
                key={i}
                onClick={() => fetchDetail(h)}
                style={{
                  padding: "7px 10px", borderBottom: `1px solid #181818`,
                  cursor: "pointer", background: selected === h ? "#1c1200" : "transparent",
                  transition: "background .1s",
                }}
                onMouseEnter={e => { if (selected !== h) e.currentTarget.style.background = "#161616"; }}
                onMouseLeave={e => { if (selected !== h) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ color: C.muted, fontFamily: "monospace", fontSize: 10 }}>{h.time}</span>
                  <span style={{ color: catColor(h.category), fontFamily: "monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>{h.category}</span>
                  <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: sentDot(h.sentiment) }} />
                </div>
                <div style={{ color: C.white, fontFamily: "monospace", fontSize: 11, lineHeight: 1.45 }}>{h.headline}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div style={{ padding: 12, overflow: "auto" }}>
          {!selected
            ? <div style={{ color: C.muted, fontFamily: "monospace", fontSize: 11, textAlign: "center", paddingTop: 24 }}>← Select a headline for AI analysis</div>
            : <>
              <div style={{ color: C.yellow, fontFamily: "monospace", fontSize: 12, fontWeight: 700, lineHeight: 1.4, borderBottom: `1px solid ${C.border}`, paddingBottom: 8, marginBottom: 10 }}>
                {selected.headline}
              </div>
              {detailLoading
                ? <div style={{ color: C.muted, fontFamily: "monospace", fontSize: 11 }}>Generating analysis...</div>
                : <div style={{ color: C.label, fontFamily: "monospace", fontSize: 11, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{detail}</div>
              }
            </>
          }
        </div>
      </div>
    </Panel>
  );
}

// ── Main Terminal ─────────────────────────────────────────────────────────────
function Terminal({ apiKey, onLogout }) {
  const [equities, setEquities] = useState(() =>
    EQUITIES_SEED.map(e => ({
      ...e,
      spark: Array.from({ length: 20 }, () => e.price * (1 + (Math.random() - 0.5) * 0.015)),
    }))
  );
  const [fx, setFx] = useState(FX_SEED);
  const [cmdty, setCmdty] = useState(CMDTY_SEED);
  const [bonds, setBonds] = useState(BONDS_SEED);
  const [lastUpd, setLastUpd] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const id = setInterval(() => {
      setEquities(prev => prev.map(e => {
        const np = jitter(e.price, 0.002);
        return { ...e, price: np, chg: e.chg + (Math.random() - 0.5) * 0.04, spark: [...e.spark.slice(1), np] };
      }));
      setFx(prev => prev.map(f => ({ ...f, rate: jitter(f.rate, 0.001), chg: f.chg + (Math.random() - 0.5) * 0.02 })));
      setCmdty(prev => prev.map(c => ({ ...c, price: jitter(c.price, 0.001), chg: c.chg + (Math.random() - 0.5) * 0.03 })));
      setBonds(prev => prev.map(b => ({ ...b, yld: jitter(b.yld, 0.0005) })));
      setLastUpd(new Date().toLocaleTimeString());
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#0d0d0d", borderBottom: `2px solid ${C.orange}`, padding: "5px 14px", display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ color: C.orange, fontSize: 15, fontWeight: 900, letterSpacing: 5, fontFamily: "monospace" }}>BLOOMBERG</span>
        <span style={{ color: C.yellow, fontSize: 15, fontWeight: 900, letterSpacing: 3, fontFamily: "monospace" }}>TERMINAL</span>
        <div style={{ width: 1, height: 18, background: C.border }} />
        {["EQUIT", "FX", "CMDTY", "FIXED", "MACRO", "NEWS"].map(t => (
          <span key={t} style={{ color: C.muted, fontSize: 10, letterSpacing: 2, cursor: "pointer", fontFamily: "monospace" }}
            onMouseEnter={e => e.target.style.color = C.orange}
            onMouseLeave={e => e.target.style.color = C.muted}
          >{t}</span>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <Clock />
          <button
            onClick={onLogout}
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontFamily: "monospace", fontSize: 9, padding: "2px 8px", cursor: "pointer", letterSpacing: 1 }}
            onMouseEnter={e => { e.target.style.borderColor = C.orange; e.target.style.color = C.orange; }}
            onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}
          >
            DISCONNECT
          </button>
        </div>
      </div>

      <Ticker equities={equities} />

      {/* Grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "auto auto 320px", gap: 5, padding: 5 }}>
        <EquitiesPanel data={equities} />
        <FXPanel data={fx} />
        <CmdtyPanel data={cmdty} />
        <BondsPanel data={bonds} />
        <MacroPanel />
        <div style={{ gridColumn: "1 / -1" }}>
          <NewsPanel apiKey={apiKey} />
        </div>
      </div>

      {/* Status bar */}
      <div style={{ background: C.orange, padding: "3px 12px", display: "flex", gap: 12, fontFamily: "monospace", fontSize: 10, fontWeight: 800, color: "#000" }}>
        <span>BLOOMBERG TERMINAL</span>
        <span style={{ opacity: 0.5 }}>|</span>
        <span>MARKETS OPEN</span>
        <span style={{ opacity: 0.5 }}>|</span>
        <span>LIVE SIMULATION</span>
        <span style={{ marginLeft: "auto" }}>UPDATED {lastUpd}</span>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("bbg_api_key") || "");

  const handleLogout = () => {
    localStorage.removeItem("bbg_api_key");
    setApiKey("");
  };

  if (!apiKey) return <ApiKeyGate onKey={setApiKey} />;
  return <Terminal apiKey={apiKey} onLogout={handleLogout} />;
}

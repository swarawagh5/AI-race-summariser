import { useState, useRef, useEffect } from "react";

// ── RACE DATA ─────────────────────────────────────────────────────────────
// In production this feeds from FastF1 API.
// Structured to mirror the real FastF1 data schema.

const RACES_2024 = [
  { id: "bahrain",    name: "Bahrain",      circuit: "Bahrain International Circuit",   laps: 57, date: "02 Mar" },
  { id: "saudi",      name: "Saudi Arabia", circuit: "Jeddah Corniche Circuit",         laps: 50, date: "09 Mar" },
  { id: "australia",  name: "Australia",    circuit: "Albert Park Circuit",             laps: 58, date: "24 Mar" },
  { id: "japan",      name: "Japan",        circuit: "Suzuka International Racing Course", laps: 53, date: "07 Apr" },
  { id: "miami",      name: "Miami",        circuit: "Miami International Autodrome",   laps: 57, date: "05 May" },
  { id: "monaco",     name: "Monaco",       circuit: "Circuit de Monaco",               laps: 78, date: "26 May" },
  { id: "silverstone",name: "Silverstone",  circuit: "Silverstone Circuit",             laps: 52, date: "07 Jul" },
  { id: "monza",      name: "Monza",        circuit: "Autodromo Nazionale Monza",       laps: 51, date: "01 Sep" },
  { id: "singapore",  name: "Singapore",    circuit: "Marina Bay Street Circuit",       laps: 62, date: "22 Sep" },
  { id: "abudhabi",   name: "Abu Dhabi",    circuit: "Yas Marina Circuit",              laps: 58, date: "08 Dec" },
];

const DRIVERS = {
  VER: { name: "Verstappen",  team: "Red Bull",    color: "#3671C6", num: 1  },
  NOR: { name: "Norris",      team: "McLaren",     color: "#FF8000", num: 4  },
  LEC: { name: "Leclerc",     team: "Ferrari",     color: "#E8002D", num: 16 },
  PIA: { name: "Piastri",     team: "McLaren",     color: "#FF8000", num: 81 },
  SAI: { name: "Sainz",       team: "Ferrari",     color: "#E8002D", num: 55 },
  HAM: { name: "Hamilton",    team: "Mercedes",    color: "#27F4D2", num: 44 },
  RUS: { name: "Russell",     team: "Mercedes",    color: "#27F4D2", num: 63 },
  ALO: { name: "Alonso",      team: "Aston Martin",color: "#358C75", num: 14 },
  PER: { name: "Pérez",       team: "Red Bull",    color: "#3671C6", num: 11 },
  TSU: { name: "Tsunoda",     team: "RB",          color: "#6692FF", num: 22 },
};

// Generate realistic race results for any GP
function generateRaceData(raceId) {
  const seed = raceId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (n) => ((seed * 9301 + 49297) % 233280) / 233280 * n;

  const order = ["VER","NOR","LEC","PIA","SAI","HAM","RUS","ALO","PER","TSU"];
  // Shuffle slightly based on race
  const shuffled = [...order];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(((seed * (i + 7)) % 100) / 100 * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const race = RACES_2024.find(r => r.id === raceId);
  const baseTime = 5400 + (seed % 600); // 90-100 minutes

  return shuffled.map((code, i) => {
    const d = DRIVERS[code];
    const gap = i === 0 ? "WINNER" : `+${(i * 4.2 + rng(8)).toFixed(3)}s`;
    const fastLap = i < 5;
    const pitStops = 1 + Math.floor(rng(2));
    const compound = ["SOFT","MEDIUM","HARD"][Math.floor(rng(3))];
    const points = [25,18,15,12,10,8,6,4,2,1][i] || 0;

    return {
      pos: i + 1,
      code,
      name: d.name,
      team: d.team,
      color: d.color,
      num: d.num,
      gap,
      fastLap,
      pitStops,
      compound,
      points,
      laps: race?.laps || 55,
      retired: false,
    };
  });
}

// Generate key race events (overtakes, pit windows, safety cars)
function generateRaceEvents(raceId, results) {
  const seed = raceId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const race = RACES_2024.find(r => r.id === raceId);
  const totalLaps = race?.laps || 55;

  const events = [];

  // Opening lap drama
  events.push({
    lap: 1,
    type: "OVERTAKE",
    desc: `${results[0].code} leads into Turn 1 from pole. ${results[2].code} passes ${results[1].code} at the first corner.`,
    icon: "⚡",
  });

  // Mid-race safety car (50% chance based on seed)
  if (seed % 3 === 0) {
    const scLap = Math.floor(totalLaps * 0.4);
    events.push({
      lap: scLap,
      type: "SAFETY_CAR",
      desc: `Virtual Safety Car deployed. ${results[4].code} takes the opportunity to pit, undercutting ${results[3].code}.`,
      icon: "🟡",
    });
  }

  // Pit windows
  const pitLap1 = Math.floor(totalLaps * 0.32);
  events.push({
    lap: pitLap1,
    type: "PIT_WINDOW",
    desc: `Strategic pit window opens. ${results[0].code} pits for ${results[0].compound === "SOFT" ? "MEDIUM" : "SOFT"} — ${results[1].code} stays out to build a buffer.`,
    icon: "🔧",
  });

  // Battle for position
  const battleLap = Math.floor(totalLaps * 0.65);
  events.push({
    lap: battleLap,
    type: "BATTLE",
    desc: `${results[1].code} closes within DRS range of ${results[0].code}. 3-lap wheel-to-wheel battle before ${results[0].code} pulls away.`,
    icon: "🔥",
  });

  // Fastest lap
  const flLap = Math.floor(totalLaps * 0.88);
  events.push({
    lap: flLap,
    type: "FASTEST_LAP",
    desc: `${results[0].code} sets fastest lap on fresh soft tyres — bolts on rubber on the final pit stop.`,
    icon: "⚡",
  });

  // Final lap
  events.push({
    lap: totalLaps,
    type: "FINISH",
    desc: `${results[0].code} takes the chequered flag. ${results[1].code} and ${results[2].code} complete the podium.`,
    icon: "🏁",
  });

  return events.sort((a, b) => a.lap - b.lap);
}

// ── CLAUDE API ─────────────────────────────────────────────────────────────
async function generateRaceNarrative(race, results, events, section) {
  const podium = results.slice(0, 3).map(r => `${r.pos}. ${r.code} (${r.team})`).join(", ");
  const winner = results[0];

  const sectionPrompts = {
    headline: `Write a single punchy headline (max 12 words) for the ${race.name} Grand Prix won by ${winner.code}/${winner.name} of ${winner.team}. Make it dramatic, specific, and vivid — like a top sports newspaper. No quotes, no punctuation at the end.`,

    intro: `You are a senior Formula 1 correspondent for a premium motorsport publication. Write a 3-paragraph race introduction for the ${race.name} Grand Prix at ${race.circuit}.

Podium: ${podium}
Winner's gap to 2nd: ${results[1].gap}
Key events: ${events.map(e => e.desc).join(" | ")}
Total laps: ${race.laps}

Write with authority, technical precision, and genuine drama. Vary sentence length. The first sentence must be arresting. Reference specific lap numbers and gaps. No generic "exciting race" phrases. Write as if for a reader who knows F1 deeply.`,

    strategy: `Analyse the pit stop strategy of the ${race.name} Grand Prix in 2 paragraphs.

Results data:
${results.slice(0, 6).map(r => `${r.code}: P${r.pos}, ${r.pitStops} stop(s), ${r.compound} tyres`).join("\n")}

Events: ${events.filter(e => e.type === "PIT_WINDOW" || e.type === "SAFETY_CAR").map(e => e.desc).join(" | ")}

Analyse the strategic decisions, undercut/overcut opportunities, and tyre management. Be specific about which strategy worked and why. Use proper F1 strategy terminology.`,

    drivers: `Write a 'Driver of the Day' verdict for the ${race.name} Grand Prix in 1 concise paragraph (4-5 sentences).

Top performers: ${results.slice(0, 4).map(r => `${r.code} P${r.pos}`).join(", ")}

Consider raw pace, strategic execution, overtaking moves, and pressure management. Name ONE winner and justify it with specific evidence from the race data. End with a single sharp sentence about what this result means for the championship.`,

    moments: `List the 3 most significant moments from the ${race.name} Grand Prix as a structured breakdown.

Events: ${events.map(e => `Lap ${e.lap}: ${e.desc}`).join(" | ")}

For each moment write: a bold 4-word title, then 2 sentences of analysis. Be technically precise. Format as three clearly separated paragraphs with the title on a separate line.`,
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: sectionPrompts[section] }],
    }),
  });

  const data = await response.json();
  return data.content?.[0]?.text || "Analysis unavailable.";
}

// ── HELPERS ───────────────────────────────────────────────────────────────
const COMPOUND_COLORS = { SOFT: "#E8002D", MEDIUM: "#FFD700", HARD: "#E8E8E8" };

function TypewriterText({ text, speed = 18 }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    idx.current = 0;
    const interval = setInterval(() => {
      if (idx.current >= text.length) {
        clearInterval(interval);
        setDone(true);
        return;
      }
      setDisplayed(text.slice(0, idx.current + 1));
      idx.current++;
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span style={{ opacity: 0.6, animation: "blink 0.8s infinite" }}>|</span>}
    </span>
  );
}

function LoadingDots({ label = "GENERATING" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "14px 0",
      color: "#555", fontSize: 11, letterSpacing: 2,
    }}>
      <div style={{ display: "flex", gap: 3 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: "50%", background: "#C9A84C",
            animation: `loadPulse 1.2s ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <span>{label}...</span>
    </div>
  );
}

function SectionCard({ title, tag, children, accent = "#C9A84C" }) {
  return (
    <div style={{
      borderTop: `2px solid ${accent}`, paddingTop: 20, marginBottom: 32,
      animation: "fadeUp 0.5s ease both",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <span style={{
          fontSize: 9, letterSpacing: 3, fontWeight: 700, color: accent,
          textTransform: "uppercase", fontFamily: "'Share Tech Mono', monospace",
          background: `${accent}18`, padding: "3px 8px", borderRadius: 2,
        }}>{tag}</span>
        <h2 style={{
          fontSize: 18, fontWeight: 800, letterSpacing: 2, color: "#E8E0CC",
          textTransform: "uppercase", margin: 0,
          fontFamily: "'Playfair Display', serif",
        }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────
export default function AIRaceSummariser() {
  const [selectedRace, setSelectedRace] = useState(null);
  const [results, setResults] = useState([]);
  const [events, setEvents] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [sections, setSections] = useState({
    headline: null, intro: null, strategy: null, drivers: null, moments: null,
  });
  const [loadingSection, setLoadingSection] = useState(null);
  const [activeTab, setActiveTab] = useState("report");
  const reportRef = useRef(null);

  async function handleGenerate() {
    if (!selectedRace) return;
    const race = RACES_2024.find(r => r.id === selectedRace);
    const raceResults = generateRaceData(selectedRace);
    const raceEvents = generateRaceEvents(selectedRace, raceResults);
    setResults(raceResults);
    setEvents(raceEvents);
    setGenerating(true);
    setGenerated(false);
    setSections({ headline: null, intro: null, strategy: null, drivers: null, moments: null });
    setActiveTab("report");

    const sectionOrder = ["headline", "intro", "strategy", "drivers", "moments"];
    let current = { headline: null, intro: null, strategy: null, drivers: null, moments: null };

    for (const sec of sectionOrder) {
      setLoadingSection(sec);
      const text = await generateRaceNarrative(race, raceResults, raceEvents, sec);
      current = { ...current, [sec]: text };
      setSections({ ...current });
    }

    setLoadingSection(null);
    setGenerating(false);
    setGenerated(true);
  }

  const race = RACES_2024.find(r => r.id === selectedRace);

  return (
    <div style={{
      background: "#0C0A06",
      minHeight: "100vh",
      fontFamily: "'Crimson Text', 'Georgia', serif",
      color: "#D4C9A8",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Crimson+Text:ital,wght@0,400;0,600;1,400;1,600&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; background: #0C0A06; }
        ::-webkit-scrollbar-thumb { background: #2a2418; }

        @keyframes fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes loadPulse{ 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes scanIn   { from{transform:scaleX(0);transform-origin:left} to{transform:scaleX(1)} }
        @keyframes tickerIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }

        .race-select-btn {
          background: none; border: 1px solid #2a2418; cursor: pointer;
          color: #7a6a48; font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 1.5px; padding: 8px 10px;
          text-transform: uppercase; transition: all 0.15s; text-align: left;
          border-radius: 2px; width: 100%;
        }
        .race-select-btn:hover { border-color: #C9A84C; color: #C9A84C; background: #C9A84C0d; }
        .race-select-btn.active { border-color: #C9A84C; color: #C9A84C; background: #C9A84C15; }

        .gen-btn {
          background: #C9A84C; border: none; cursor: pointer; width: 100%;
          color: #0C0A06; font-family: 'Share Tech Mono', monospace;
          font-size: 12px; letter-spacing: 2px; padding: 13px;
          font-weight: 700; text-transform: uppercase; transition: background 0.15s;
          border-radius: 2px;
        }
        .gen-btn:hover { background: #e0c06a; }
        .gen-btn:disabled { background: #3a2f1a; color: #5a4a28; cursor: not-allowed; }

        .tab-btn {
          background: none; border: none; cursor: pointer;
          color: #4a3f28; font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 2px; padding: 10px 16px;
          border-bottom: 1px solid transparent; text-transform: uppercase;
          transition: all 0.15s;
        }
        .tab-btn:hover { color: #8a7a58; }
        .tab-btn.active { color: #C9A84C; border-bottom-color: #C9A84C; }

        .report-body { font-size: 16px; line-height: 1.85; color: #C8B98A; letter-spacing: 0.2px; }
        .report-body p { margin-bottom: 1.2em; }

        .pos-medal-1 { color: #FFD700; }
        .pos-medal-2 { color: #C0C0C0; }
        .pos-medal-3 { color: #CD7F32; }

        .event-row:hover { background: #1a1508 !important; }
      `}</style>

      {/* ── NEWSPAPER HEADER ── */}
      <div style={{
        borderBottom: "3px double #2a2418",
        padding: "18px 32px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{
            background: "#C9A84C", color: "#0C0A06", padding: "5px 12px",
            fontFamily: "'Share Tech Mono', monospace", fontSize: 11,
            fontWeight: 700, letterSpacing: 3, borderRadius: 1,
          }}>F1</div>
          <div>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900,
              color: "#E8E0CC", letterSpacing: 1, lineHeight: 1,
            }}>RACE INTELLIGENCE</div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#4a3f28", letterSpacing: 3, marginTop: 3 }}>
              AI-POWERED POST-RACE ANALYSIS ENGINE
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#4a3f28", letterSpacing: 2 }}>
            2024 FIA FORMULA ONE WORLD CHAMPIONSHIP
          </div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#3a3020", letterSpacing: 1, marginTop: 3 }}>
            POWERED BY CLAUDE · FASTF1 DATA PIPELINE
          </div>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>

        {/* ── SIDEBAR ── */}
        <div style={{
          width: 200, borderRight: "1px solid #1a1508", flexShrink: 0,
          padding: "20px 14px", background: "#080601",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace", fontSize: 8,
            color: "#3a3020", letterSpacing: 3, textTransform: "uppercase",
            marginBottom: 8,
          }}>2024 Season</div>

          {RACES_2024.map(r => (
            <button key={r.id}
              className={`race-select-btn ${selectedRace === r.id ? "active" : ""}`}
              onClick={() => { setSelectedRace(r.id); setGenerated(false); setSections({ headline: null, intro: null, strategy: null, drivers: null, moments: null }); }}
            >
              <div style={{ fontSize: 11, fontWeight: 700 }}>{r.name.toUpperCase()}</div>
              <div style={{ fontSize: 8, opacity: 0.6, marginTop: 2 }}>{r.date}</div>
            </button>
          ))}

          <div style={{ marginTop: 12 }}>
            <button className="gen-btn" onClick={handleGenerate}
              disabled={!selectedRace || generating}>
              {generating ? "WRITING..." : "▶ GENERATE REPORT"}
            </button>
          </div>

          {generating && (
            <div style={{ marginTop: 8 }}>
              {["headline","intro","strategy","drivers","moments"].map(s => (
                <div key={s} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "3px 0",
                }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: sections[s] ? "#C9A84C" : loadingSection === s ? "#8a6a2a" : "#2a2010",
                    transition: "background 0.3s",
                  }} />
                  <span style={{
                    fontFamily: "'Share Tech Mono', monospace", fontSize: 8,
                    letterSpacing: 1, textTransform: "uppercase",
                    color: sections[s] ? "#C9A84C" : loadingSection === s ? "#8a6a2a" : "#3a3020",
                  }}>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, overflow: "auto" }}>

          {/* Empty state */}
          {!selectedRace && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "70vh", gap: 16, color: "#2a2010",
            }}>
              <div style={{ fontSize: 64, opacity: 0.2 }}>🏁</div>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontSize: 22,
                fontWeight: 800, letterSpacing: 2, color: "#3a3020",
              }}>SELECT A GRAND PRIX</div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#2a2010", letterSpacing: 2 }}>
                Choose a race from the 2024 season to generate a full report
              </div>
            </div>
          )}

          {/* Race selected — show data */}
          {selectedRace && race && (
            <div>
              {/* Race header banner */}
              <div style={{
                padding: "24px 32px 0",
                borderBottom: "1px solid #1a1508",
              }}>
                <div style={{
                  fontFamily: "'Share Tech Mono', monospace", fontSize: 8,
                  color: "#4a3f28", letterSpacing: 3, marginBottom: 8,
                }}>
                  ROUND {RACES_2024.findIndex(r => r.id === selectedRace) + 1} · 2024 FIA FORMULA ONE WORLD CHAMPIONSHIP
                </div>

                {/* Headline — typewriter when generated */}
                {sections.headline ? (
                  <h1 style={{
                    fontFamily: "'Playfair Display', serif", fontSize: 36,
                    fontWeight: 900, color: "#E8E0CC", lineHeight: 1.15,
                    letterSpacing: 0.5, marginBottom: 12, maxWidth: 700,
                    animation: "fadeUp 0.5s ease both",
                  }}>
                    <TypewriterText text={sections.headline} speed={28} />
                  </h1>
                ) : (
                  <h1 style={{
                    fontFamily: "'Playfair Display', serif", fontSize: 36,
                    fontWeight: 900, color: "#3a3020", lineHeight: 1.15,
                    letterSpacing: 0.5, marginBottom: 12,
                  }}>
                    {race.name.toUpperCase()} GRAND PRIX
                  </h1>
                )}

                <div style={{
                  fontFamily: "'Share Tech Mono', monospace", fontSize: 10,
                  color: "#5a4a2a", letterSpacing: 2, marginBottom: 16,
                }}>
                  {race.circuit.toUpperCase()} · {race.laps} LAPS · {race.date} 2024
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid #1a1508", marginBottom: 0 }}>
                  {[
                    { id: "report",  label: "Race Report"  },
                    { id: "results", label: "Results"      },
                    { id: "events",  label: "Race Events"  },
                  ].map(t => (
                    <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                      onClick={() => setActiveTab(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── TAB: REPORT ── */}
              {activeTab === "report" && (
                <div ref={reportRef} style={{ padding: "32px 32px 48px", maxWidth: 840 }}>

                  {/* Not yet generated */}
                  {!generated && !generating && (
                    <div style={{ color: "#3a3020", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 2, padding: "40px 0" }}>
                      Click ▶ GENERATE REPORT to write the full race analysis with AI.
                    </div>
                  )}

                  {/* ── INTRO SECTION ── */}
                  {(sections.intro || loadingSection === "intro" || (generating && !sections.intro && sections.headline)) && (
                    <SectionCard title="Race Report" tag="Full Report" accent="#C9A84C">
                      {sections.intro ? (
                        <div className="report-body">
                          {sections.intro.split("\n\n").map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      ) : <LoadingDots label="WRITING RACE REPORT" />}
                    </SectionCard>
                  )}

                  {/* ── STRATEGY SECTION ── */}
                  {(sections.strategy || loadingSection === "strategy") && (
                    <SectionCard title="Strategic Analysis" tag="Pit Wall" accent="#4A9EFF">
                      {sections.strategy ? (
                        <div className="report-body">
                          {sections.strategy.split("\n\n").map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      ) : <LoadingDots label="ANALYSING STRATEGY" />}
                    </SectionCard>
                  )}

                  {/* ── DRIVER RATINGS ── */}
                  {(sections.drivers || loadingSection === "drivers") && (
                    <SectionCard title="Driver of the Day" tag="Verdict" accent="#00CC66">
                      {sections.drivers ? (
                        <div className="report-body">{sections.drivers}</div>
                      ) : <LoadingDots label="EVALUATING DRIVERS" />}
                    </SectionCard>
                  )}

                  {/* ── KEY MOMENTS ── */}
                  {(sections.moments || loadingSection === "moments") && (
                    <SectionCard title="Key Moments" tag="Highlights" accent="#E8002D">
                      {sections.moments ? (
                        <div className="report-body">
                          {sections.moments.split("\n\n").map((block, i) => {
                            const lines = block.split("\n");
                            const isTitle = lines[0] && lines[0].length < 40;
                            return (
                              <div key={i} style={{ marginBottom: "1.4em" }}>
                                {isTitle && (
                                  <div style={{
                                    fontFamily: "'Share Tech Mono', monospace",
                                    fontSize: 11, letterSpacing: 2, color: "#E8002D",
                                    textTransform: "uppercase", marginBottom: 6,
                                  }}>{lines[0]}</div>
                                )}
                                <p style={{ marginBottom: 0 }}>{isTitle ? lines.slice(1).join(" ") : block}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : <LoadingDots label="IDENTIFYING KEY MOMENTS" />}
                    </SectionCard>
                  )}
                </div>
              )}

              {/* ── TAB: RESULTS ── */}
              {activeTab === "results" && results.length > 0 && (
                <div style={{ padding: "24px 32px" }}>
                  <div style={{
                    fontFamily: "'Share Tech Mono', monospace", fontSize: 8,
                    color: "#3a3020", letterSpacing: 3, marginBottom: 16,
                  }}>
                    OFFICIAL RACE CLASSIFICATION — {race.name.toUpperCase()} GP {race.date} 2024
                  </div>

                  {/* Podium cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
                    {results.slice(0, 3).map((r, i) => (
                      <div key={r.code} style={{
                        background: "#0a0802", border: `1px solid ${r.color}44`,
                        borderTop: `3px solid ${r.color}`,
                        padding: "16px 18px", borderRadius: 2,
                        animation: `fadeUp 0.4s ${i * 0.1}s ease both`,
                      }}>
                        <div style={{
                          fontFamily: "'Share Tech Mono', monospace", fontSize: 28,
                          fontWeight: 700, color: ["#FFD700","#C0C0C0","#CD7F32"][i],
                          lineHeight: 1,
                        }}>P{r.pos}</div>
                        <div style={{
                          fontFamily: "'Playfair Display', serif", fontSize: 20,
                          fontWeight: 800, color: "#E8E0CC", marginTop: 6, letterSpacing: 0.5,
                        }}>{r.code}</div>
                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: r.color, marginTop: 2, letterSpacing: 1 }}>{r.team.toUpperCase()}</div>
                        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#8a7a58", marginTop: 8 }}>
                          {r.gap}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                          <span style={{
                            background: COMPOUND_COLORS[r.compound] + "22",
                            border: `1px solid ${COMPOUND_COLORS[r.compound]}44`,
                            color: COMPOUND_COLORS[r.compound],
                            fontFamily: "'Share Tech Mono', monospace", fontSize: 8,
                            letterSpacing: 1, padding: "2px 6px", borderRadius: 2,
                          }}>{r.compound}</span>
                          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#5a4a28" }}>
                            {r.points} PTS
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Full results table */}
                  <div style={{ border: "1px solid #1a1508", borderRadius: 2, overflow: "hidden" }}>
                    {/* Header */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "40px 50px 1fr 1fr 100px 60px 60px 50px",
                      padding: "8px 16px", borderBottom: "1px solid #1a1508",
                      fontFamily: "'Share Tech Mono', monospace", fontSize: 8,
                      color: "#3a3020", letterSpacing: 2, textTransform: "uppercase",
                      background: "#080601",
                    }}>
                      <span>POS</span><span>NO.</span><span>DRIVER</span><span>TEAM</span>
                      <span>GAP/TIME</span><span>PIT</span><span>TYRE</span><span>PTS</span>
                    </div>
                    {results.map((r, i) => (
                      <div key={r.code} className="event-row" style={{
                        display: "grid",
                        gridTemplateColumns: "40px 50px 1fr 1fr 100px 60px 60px 50px",
                        padding: "10px 16px",
                        borderBottom: "1px solid #0e0c06",
                        background: "transparent", transition: "background 0.1s",
                        animation: `fadeUp 0.3s ${i * 0.04}s ease both`,
                        borderLeft: i < 3 ? `2px solid ${r.color}` : "2px solid transparent",
                      }}>
                        <span style={{
                          fontFamily: "'Share Tech Mono', monospace", fontSize: 14, fontWeight: 700,
                          color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#5a4a28",
                        }}>P{r.pos}</span>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#4a3f28" }}>{r.num}</span>
                        <div>
                          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: "#C8B98A" }}>{r.code}</span>
                          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#5a4a28", marginLeft: 8 }}>{r.name}</span>
                        </div>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: r.color, letterSpacing: 0.5 }}>{r.team.toUpperCase()}</span>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#8a7a58" }}>{r.gap}</span>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#5a4a28" }}>{r.pitStops}</span>
                        <span style={{
                          fontFamily: "'Share Tech Mono', monospace", fontSize: 9,
                          color: COMPOUND_COLORS[r.compound],
                        }}>{r.compound}</span>
                        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: i < 10 ? "#C9A84C" : "#3a3020" }}>
                          {r.points > 0 ? r.points : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB: EVENTS ── */}
              {activeTab === "events" && events.length > 0 && (
                <div style={{ padding: "24px 32px" }}>
                  <div style={{
                    fontFamily: "'Share Tech Mono', monospace", fontSize: 8,
                    color: "#3a3020", letterSpacing: 3, marginBottom: 20,
                  }}>
                    RACE TIMELINE — KEY INCIDENTS & STRATEGY CALLS
                  </div>

                  <div style={{ position: "relative", paddingLeft: 32 }}>
                    {/* Vertical timeline line */}
                    <div style={{
                      position: "absolute", left: 10, top: 0, bottom: 0,
                      width: 1, background: "#1a1508",
                    }} />

                    {events.map((ev, i) => {
                      const typeColors = {
                        OVERTAKE: "#C9A84C",
                        SAFETY_CAR: "#FFD700",
                        PIT_WINDOW: "#4A9EFF",
                        BATTLE: "#E8002D",
                        FASTEST_LAP: "#00CC66",
                        FINISH: "#C9A84C",
                      };
                      const color = typeColors[ev.type] || "#5a4a28";

                      return (
                        <div key={i} style={{
                          position: "relative", marginBottom: 24,
                          animation: `tickerIn 0.4s ${i * 0.08}s ease both`,
                        }}>
                          {/* Dot on timeline */}
                          <div style={{
                            position: "absolute", left: -27, top: 4,
                            width: 8, height: 8, borderRadius: "50%",
                            background: color, border: `1px solid ${color}66`,
                          }} />

                          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                            <div style={{
                              fontFamily: "'Share Tech Mono', monospace", fontSize: 9,
                              color: color, letterSpacing: 2, background: color + "15",
                              padding: "2px 7px", borderRadius: 2,
                            }}>LAP {ev.lap}</div>
                            <div style={{
                              fontFamily: "'Share Tech Mono', monospace", fontSize: 8,
                              color: "#4a3a20", letterSpacing: 1.5, textTransform: "uppercase",
                            }}>{ev.type.replace("_", " ")}</div>
                            <div style={{ fontSize: 14 }}>{ev.icon}</div>
                          </div>
                          <div style={{
                            fontSize: 15, lineHeight: 1.7, color: "#B8A880",
                            fontFamily: "'Crimson Text', serif",
                          }}>{ev.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Waiting for results data */}
              {activeTab !== "report" && results.length === 0 && (
                <div style={{ padding: 32, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#3a3020", letterSpacing: 2 }}>
                  Generate a report first to populate race data.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid #1a1508", padding: "10px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#080601",
      }}>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#2a2010", letterSpacing: 2 }}>
          ONYX RACING FS · AI RACE INTELLIGENCE · BUILT BY SWARA
        </span>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "#2a2010", letterSpacing: 2 }}>
          POWERED BY CLAUDE · FASTF1 DATA PIPELINE
        </span>
      </div>
    </div>
  );
}

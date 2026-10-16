// @ts-nocheck
"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Maskot robot — komponen React, SVG murni (hanya butuh React 18+)
 *
 *   import { Mascot } from "./Mascot";
 *   <Mascot mood="senang" size={160} say="Halo!" follow />
 *
 * mood     senang | wink | sedih | marah | kaget | bingung | tertawa | fokus
 *          lelah | cinta | termotivasi | capek | penasaran | salam | semangat
 * size     lebar dalam px (tinggi mengikuti)
 * say      teks balon ucapan (opsional)
 * follow   mata mengikuti kursor
 * animate  false = diam (cocok untuk thumbnail)
 */
export const MOODS = {
  senang: "Senang", wink: "Wink", sedih: "Sedih", marah: "Marah", kaget: "Kaget",
  bingung: "Bingung", tertawa: "Tertawa", fokus: "Fokus", lelah: "Lelah", cinta: "Cinta",
  termotivasi: "Termotivasi", capek: "Capek", penasaran: "Penasaran", salam: "Salam", semangat: "Semangat",
};

const C = "#86f4ff", Y = "#ffd23f", BL = "#3b82f6", PK = "#ff6f91";
const SH = "#c3d2e8", WH = "#f6f9ff";
const ln = (c, w = 4) => ({ fill: "none", stroke: c, strokeWidth: w, strokeLinecap: "round", strokeLinejoin: "round" });
const eye = ln(C, 4.6);

/* ── potongan wajah (koordinat di dalam layar hitam) ── */
const open = (x, k = 1) => (
  <g><ellipse cx={x} cy="82" rx={8.5 * k} ry={10.5 * k} fill={C} /><circle cx={x + 2.5} cy="78" r="2.6" fill="#fff" opacity=".9" /></g>
);
const arc = (x) => <path d={`M${x - 9} 87Q${x} 71 ${x + 9} 87`} {...eye} />;
const gt = (x) => <path d={`M${x - 7} 72L${x + 7} 82L${x - 7} 92`} {...eye} />;
const lt = (x) => <path d={`M${x + 7} 72L${x - 7} 82L${x + 7} 92`} {...eye} />;
const ring = (x) => <circle cx={x} cy="82" r="8" {...ln(C, 4.4)} />;
const lid = (x) => <path d={`M${x - 9} 82H${x + 9}A9 9 0 0 1 ${x - 9} 82Z`} fill={C} />;
const xx = (x) => <path d={`M${x - 6} 76L${x + 6} 88M${x + 6} 76L${x - 6} 88`} {...ln(C, 4)} />;
const mad = (y) => (
  <>
    <path d={`M68 ${y}L92 85Q92 98 80 98Q68 98 68 88Z`} fill={C} />
    <path d={`M132 ${y}L108 85Q108 98 120 98Q132 98 132 88Z`} fill={C} />
  </>
);
const mouth = (d, c = C, w = 3.4) => <path d={d} {...ln(c, w)} />;

/* ── efek di sekitar maskot ── */
const heart = (x, y, s, c = PK) => <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 8C-14-2-7-12 0-5C7-12 14-2 0 8Z" fill={c} />;
const spark = (x, y, s = 1) => <path transform={`translate(${x} ${y}) scale(${s})`} d="M0-7Q1-1 7 0Q1 1 0 7Q-1 1-7 0Q-1-1 0-7Z" fill={Y} />;
const bolt = (x, y, s = 1, r = 0) => <path transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} d="M2-10L-5 2H-1L-3 10L5-3H0Z" fill={Y} />;
const swirl = (x, y) => <path transform={`translate(${x} ${y})`} d="M10 14C-4 14-6 0 6-3C18-6 24 8 14 12C6 15 2 6 9 5" {...ln("#3c4658", 3.2)} />;
const cross = (x, y) => <path transform={`translate(${x} ${y})`} d="M-4-4L4 4M4-4L-4 4" {...ln(BL, 2.6)} />;

/**
 * Definisi ekspresi
 *  e: mata · m: mulut · p: posisi tangan [kiriX, kiriY, kananX, kananY]
 *  t: kemiringan kepala · b: berkedip · w: tangan melambai
 *  x: efek · mid: objek di depan perut · low: posisi rebah
 */
const arcs = <>{arc(80)}{arc(120)}</>;
const D: Record<string, any> = {
  senang: { e: arcs, p: [30, 124, 170, 124], x: <path d="M8 58L18 62M6 74H17M192 58L182 62M194 74H183" {...ln("#5fd3ff", 3)} /> },
  wink: { e: <>{open(80)}{lt(120)}</>, p: [56, 186, 152, 126], t: -3, b: 1, x: spark(178, 72, 1.4) },
  sedih: {
    e: <>{open(80, 0.9)}{open(120, 0.9)}<path d="M76 94q-5 8 0 10q5-2 0-10z" fill="#7cc8ff" /></>,
    m: mouth("M92 103Q100 96 108 103"), p: [88, 136, 112, 136], b: 1,
  },
  marah: {
    e: mad(74), m: mouth("M92 105Q100 100 108 105"), p: [112, 158, 88, 162],
    x: <g {...ln("#ff4d4d", 3.5)}><path d="M138 22q7 0 7 7M162 22q-7 0-7 7M138 48q7 0 7-7M162 48q-7 0-7-7" /></g>,
  },
  kaget: {
    e: <>{ring(80)}{ring(120)}</>, m: <ellipse cx="100" cy="104" rx="3.6" ry="4.8" fill={C} />,
    p: [78, 136, 122, 136], x: <path d="M150 22L146 6M168 28L178 16M180 44L194 38" {...ln(Y, 5)} />,
  },
  bingung: {
    e: <>{open(80)}{lt(120)}</>, m: mouth("M92 104q4-5 8 0t8 0", C, 3), p: [90, 128, 146, 184], t: -6, b: 1,
    x: <text x="12" y="40" fontSize="38" fontWeight="800" fill={BL} fontFamily="ui-rounded,system-ui,sans-serif">?</text>,
  },
  tertawa: {
    e: <>{gt(80)}{lt(120)}</>,
    m: <><path d="M87 94Q100 118 113 94Z" fill={C} /><ellipse cx="100" cy="103" rx="5.5" ry="3" fill="#ff8fb0" /></>,
    p: [32, 126, 168, 126], x: <>{cross(18, 62)}{cross(184, 62)}{cross(14, 104)}{cross(188, 98)}</>,
  },
  fokus: {
    e: mad(78), m: mouth("M94 104H106", C, 3.2), p: [82, 178, 120, 176],
    mid: (
      <g>
        <path d="M62 170L138 162L144 192L68 200Z" fill="#8fd0ff" fillOpacity=".38" stroke="#bfe6ff" strokeWidth="1.5" />
        <path d="M76 179L124 173M78 187L114 183" {...ln("#e9f7ff", 2)} />
      </g>
    ),
  },
  lelah: { e: <>{lid(80)}{lid(120)}</>, m: mouth("M94 104H106", C, 3), p: [56, 188, 144, 188], t: 3, x: swirl(134, 6) },
  cinta: {
    e: <>{heart(80, 82, 1.5)}{heart(120, 82, 1.5)}</>, m: mouth("M92 100Q100 108 108 100", PK, 3.6),
    p: [90, 134, 110, 134], x: <>{heart(172, 36, 1.7)}{heart(188, 56, 1.2)}</>,
  },
  termotivasi: {
    e: <>{open(80)}{open(120)}</>, m: mouth("M93 99Q100 107 107 99"), p: [54, 186, 156, 114], b: 1,
    x: <path d="M168 34l7-7M178 48l11-4" {...ln(Y, 5)} />,
  },
  capek: {
    low: 1, e: <>{xx(80)}{xx(120)}</>, m: mouth("M88 104Q92 99 96 104T104 104T112 104", C, 3),
    p: [34, 200, 166, 200], x: swirl(22, 60),
  },
  penasaran: {
    e: <>{open(80, 1.1)}{open(120, 1.1)}</>, p: [48, 124, 146, 184], t: -8, b: 1,
    x: (
      <>
        <circle cx="70" cy="86" r="15" fill="#cfeeff" fillOpacity=".22" stroke="#8bd13f" strokeWidth="4.5" />
        <path d="M60 98L47 116" {...ln("#8bd13f", 5)} />
        <path d="M160 30l6-8M170 42l9-5" {...ln(Y, 4.5)} />
      </>
    ),
  },
  salam: { e: arcs, p: [56, 186, 162, 112], w: 1, x: <path d="M176 92q8 8 0 16M185 86q13 14 0 28" {...ln("#4a90e2", 3)} /> },
  semangat: {
    e: <>{gt(80)}{lt(120)}</>, m: mouth("M94 100Q100 106 106 100", C, 3), p: [46, 128, 154, 128],
    x: <>{bolt(22, 70, 1.4, -12)}{bolt(178, 66, 1.4, 12)}{bolt(100, 16, 1.2)}{bolt(190, 108, 1, 20)}</>,
  },
};

const CSS = `
.mm-float{animation:mm-f 3.2s ease-in-out infinite}
.mm-pop{transform-origin:100px 208px;animation:mm-p .45s cubic-bezier(.3,1.7,.5,1)}
.mm-blink{transform-box:fill-box;transform-origin:center;animation:mm-b 4.6s infinite}
.mm-ant{transform-origin:60px 62px;animation:mm-a 3.4s ease-in-out infinite}
.mm-wave{transform-origin:132px 150px;animation:mm-w .8s ease-in-out infinite alternate}
.mm-fx{transform-box:fill-box;transform-origin:center;animation:mm-x 1.6s ease-in-out infinite}
.mm-still,.mm-still *{animation:none!important}
.mm-say{position:absolute;right:105%;top:50%;transform:translateY(-50%);margin-right:10px;max-width:210px;white-space:normal;padding:6px 11px;border-radius:12px;background:#fff;color:#1e40af;border:1px solid #bfdbfe;font:600 11px/1.35 system-ui,-apple-system,sans-serif;text-align:left;box-shadow:0 8px 24px rgba(37,99,235,0.14),0 2px 6px rgba(0,0,0,0.04);z-index:50;pointer-events:auto;animation:mm-bubble .25s cubic-bezier(.16,1,.3,1)}
.mm-say:after{content:"";position:absolute;left:100%;top:50%;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;background:#fff;border:solid #bfdbfe;border-width:1px 1px 0 0;transform:rotate(45deg)}
@keyframes mm-bubble{from{opacity:0;transform:translateY(-50%) scale(.85)}to{opacity:1;transform:translateY(-50%) scale(1)}}
.mm-interactive{cursor:pointer;transition:transform .2s cubic-bezier(0.16,1,0.3,1),filter .2s ease;user-select:none;-webkit-tap-highlight-color:transparent}
.mm-interactive:hover{transform:scale(1.08);filter:drop-shadow(0 6px 16px rgba(59,130,246,0.25))}
.mm-interactive:active{transform:scale(0.92)}
.mm-badge{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:700;background:rgba(30,58,110,0.9);color:#fff;padding:1px 6px;border-radius:999px;white-space:nowrap;letter-spacing:0.3px;pointer-events:none;box-shadow:0 2px 6px rgba(0,0,0,0.2);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.2)}
@keyframes mm-f{50%{transform:translateY(-4px)}}
@keyframes mm-p{from{transform:scale(.93) translateY(5px);opacity:.5}}
@keyframes mm-b{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.12)}}
@keyframes mm-a{50%{transform:rotate(-5deg)}}
@keyframes mm-w{from{transform:rotate(-10deg)}to{transform:rotate(10deg)}}
@keyframes mm-x{50%{transform:scale(1.12);opacity:.75}}
@media (prefers-reduced-motion:reduce){.mm *{animation:none!important}}`;

const Arm = ({ sx, sy, hx, hy, cls = "" }: { sx: number; sy: number; hx: number; hy: number; cls?: string }) => (
  <g className={cls}>
    <path d={`M${sx} ${sy}L${hx} ${hy}`} stroke={SH} strokeWidth="18" strokeLinecap="round" />
    <path d={`M${sx} ${sy}L${hx} ${hy}`} stroke={WH} strokeWidth="15" strokeLinecap="round" />
    <circle cx={hx} cy={hy} r="11" fill={WH} stroke={SH} strokeWidth="1.2" />
  </g>
);

export const SAY: Record<string, string> = {
  senang: "Hore, kamu datang!", wink: "Rahasia kita ya.", sedih: "Yah, kok gagal ya?",
  marah: "Hmph! Jangan diulang lagi.", kaget: "Hah?! Serius?!", bingung: "Bingung navigasi? Tanya Smart AI aja!",
  tertawa: "Wkwkwk, lucu banget!", fokus: "Sebentar, aku lagi fokus.", lelah: "Istirahat dulu, yuk.",
  cinta: "Makasih, aku sayang kamu!", termotivasi: "Kamu pasti bisa!", capek: "Zzz… baterai habis.",
  penasaran: "Bingung navigasi? Tanya Smart AI aja!", salam: "Halo, apa kabar?", semangat: "Ayo gaskeun!",
};

export const MOOD_KEYS = Object.keys(MOODS) as Array<keyof typeof MOODS>;

export interface MascotProps {
  mood?: keyof typeof MOODS | string;
  size?: number;
  say?: string;
  animate?: boolean;
  follow?: boolean;
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>, currentMood: string) => void;
  showBadge?: boolean;
}

export function Mascot({
  mood = "senang",
  size = 160,
  say,
  animate = true,
  follow = false,
  className = "",
  style,
  interactive = false,
  onClick,
  showBadge = false,
}: MascotProps) {
  const id = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [activeMood, setActiveMood] = useState<string>(mood);
  const [activeSay, setActiveSay] = useState<string | undefined>(say);

  useEffect(() => {
    setActiveMood(mood);
  }, [mood]);

  useEffect(() => {
    setActiveSay(say);
  }, [say]);

  const d = D[activeMood] || D.senang;
  const [lx, ly, rx, ry] = d.p || [52, 184, 148, 184];
  const u = (s: string) => `url(#${id}${s})`;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(e, activeMood);
    }
    if (interactive) {
      const idx = MOOD_KEYS.indexOf(activeMood as keyof typeof MOODS);
      const nextIdx = (idx + 1) % MOOD_KEYS.length;
      const nextMood = MOOD_KEYS[nextIdx];
      setActiveMood(nextMood);
      setActiveSay(SAY[nextMood] || "Semangat!");
    }
  };

  useEffect(() => {
    if (!follow) { setLook({ x: 0, y: 0 }); return; }
    const move = (e: PointerEvent) => {
      if (!svg.current) return;
      const r = svg.current.getBoundingClientRect();
      const k = (v: number, c: number) => Math.max(-1, Math.min(1, (v - c) / 280));
      setLook({ x: k(e.clientX, r.left + r.width / 2) * 4, y: k(e.clientY, r.top + r.height / 2) * 3 });
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [follow]);

  const ears = (
    <>
      <ellipse cx="33" cy="92" rx="13" ry="21" fill={u("b")} />
      <ellipse cx="31" cy="92" rx="6" ry="14" fill="#d3e8ff" opacity=".55" />
      <path className="mm-ant" d="M54 62C40 50 32 30 38 8C54 20 66 40 66 60Z" fill={u("b")} />
    </>
  );

  return (
    <div
      className={`mm ${interactive ? "mm-interactive" : ""} ${className}`}
      onClick={handleClick}
      role={interactive || onClick ? "button" : undefined}
      tabIndex={interactive || onClick ? 0 : undefined}
      title={interactive ? `Maskot: ${MOODS[activeMood] || activeMood} (Klik untuk ganti 15 karakter)` : undefined}
      style={{ position: "relative", display: "inline-block", width: size, ...style }}
    >
      <style>{CSS}</style>
      {activeSay && <div className="mm-say" role="status">{activeSay}</div>}
      {showBadge && <div className="mm-badge">{MOODS[activeMood] || activeMood}</div>}
      <svg
        ref={svg} viewBox="0 0 200 220" width={size} height={size * 1.1} role="img"
        aria-label={`Maskot robot: ${MOODS[activeMood] || activeMood}`} className={animate ? "" : "mm-still"}
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <radialGradient id={`${id}w`} cx=".3" cy=".2" r=".95">
            <stop offset="0" stopColor="#fff" /><stop offset=".55" stopColor="#f0f5fc" /><stop offset="1" stopColor="#c9d8ee" />
          </radialGradient>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9bc8ff" /><stop offset="1" stopColor="#4a86e0" />
          </linearGradient>
          <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1d2740" /><stop offset="1" stopColor="#05080f" />
          </linearGradient>
          <filter id={`${id}g`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <ellipse cx="100" cy="209" rx={d.low ? 62 : 44} ry="6.5" fill="#5b7db3" opacity=".2" />

        <g key={activeMood} className="mm-pop">
          <g className={d.low ? "" : "mm-float"}>
            {/* badan */}
            {!d.low && (
              <>
                <ellipse cx="100" cy="184" rx="33" ry="26" fill={u("w")} stroke={SH} strokeWidth="1" />
                <path d="M68 146C68 136 78 134 88 134H112C122 134 132 136 132 146V170C132 178 124 182 116 178L100 190L84 178C76 182 68 178 68 170Z" fill={u("b")} />
                <circle cx="100" cy="158" r="10" fill="#e8f7ff" />
                <circle cx="100" cy="158" r="6.5" fill={C} filter={u("g")} />
                {d.mid}
              </>
            )}

            {/* kepala */}
            <g transform={`translate(0 ${d.low ? 66 : 0}) rotate(${d.t || 0} 100 134)`}>
              {ears}
              <g transform="translate(200 0) scale(-1 1)">{ears}</g>
              <ellipse cx="100" cy="137" rx="44" ry="7" fill="#2c4f8f" opacity=".16" />
              <rect x="38" y="34" width="124" height="100" rx="40" fill={u("w")} stroke={SH} strokeWidth="1.2" />
              <ellipse cx="70" cy="45" rx="20" ry="6" fill="#fff" opacity=".75" transform="rotate(-16 70 45)" />
              <rect x="50" y="48" width="100" height="70" rx="30" fill={u("s")} />
              <path d="M62 60Q76 53 94 54" {...ln("#fff", 3)} opacity=".25" />
              <g style={{ transform: `translate(${look.x}px,${look.y}px)`, transition: "transform .15s" }}>
                <g filter={u("g")} className={d.b ? "mm-blink" : ""}>{d.e}</g>
                {d.m && <g filter={u("g")}>{d.m}</g>}
              </g>
            </g>

            {/* tangan */}
            {d.low ? (
              <>
                <Arm sx={70} sy={196} hx={lx} hy={ly} />
                <Arm sx={130} sy={196} hx={rx} hy={ry} />
              </>
            ) : (
              <>
                <Arm sx={68} sy={150} hx={lx} hy={ly} />
                <Arm sx={132} sy={150} hx={rx} hy={ry} cls={d.w ? "mm-wave" : ""} />
                <circle cx="68" cy="150" r="12" fill={u("b")} />
                <circle cx="132" cy="150" r="12" fill={u("b")} />
              </>
            )}

            {d.x && <g className="mm-fx">{d.x}</g>}
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ───────── Demo: klik ekspresi untuk melihatnya ───────── */
export default function MascotShowcase() {
  const [mood, setMood] = useState("senang");
  return (
    <div style={{ minHeight: "100vh", padding: "28px 16px 40px", background: "linear-gradient(#eaf3ff,#fff 60%)", fontFamily: "ui-rounded,'SF Pro Rounded',system-ui,sans-serif", color: "#1e3a6e" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <div style={{ height: 84 }} />
        <Mascot mood={mood} size={220} say={SAY[mood]} follow />
        <h1 style={{ margin: "16px 0 6px", fontSize: 28, fontWeight: 800 }}>{MOODS[mood]}</h1>
        <code style={{ fontSize: 13, background: "#e1ecff", padding: "4px 10px", borderRadius: 8 }}>{`<Mascot mood="${mood}" />`}</code>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(104px,1fr))", gap: 10, marginTop: 26 }}>
          {Object.entries(MOODS).map(([k, label]) => (
            <button
              key={k} onClick={() => setMood(k)} aria-pressed={k === mood}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 6px 8px",
                borderRadius: 18, cursor: "pointer", font: "700 12px/1 inherit", color: "inherit",
                border: `2px solid ${k === mood ? "#4a86e0" : "#dbe7fa"}`, background: k === mood ? "#eef5ff" : "#fff",
              }}
            >
              <Mascot mood={k} size={72} animate={false} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

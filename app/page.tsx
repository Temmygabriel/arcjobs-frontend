"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits } from "viem";
import JobBoard from "@/components/JobBoard";
import PostJob from "@/components/PostJob";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "@/lib/contract";

type Job = { id: bigint; client: string; provider: string; evaluator: string; description: string; budget: bigint; expiredAt: bigint; status: number; hook: string; };

// Real completed jobs onchain
const COMPLETED_JOBS: Record<string, { completedAt: string; settleMs: number }> = {
  "21": { completedAt: "Apr 11, 2026", settleMs: 412 },
  "22": { completedAt: "Apr 11, 2026", settleMs: 387 },
  "23": { completedAt: "Apr 11, 2026", settleMs: 441 },
};

function LiveStats() {
  const { data: jobCounter } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "jobCounter",
  }) as { data: bigint | undefined };

  const totalJobs = jobCounter ? Number(jobCounter) : 23;
  const completedCount = Object.keys(COMPLETED_JOBS).length;
  const totalUSDC = completedCount * 10; // 10 USDC per completed job
  const fastestMs = Math.min(...Object.values(COMPLETED_JOBS).map(j => j.settleMs));

  const stats = [
    { v: totalJobs.toString(), l: "Jobs posted onchain" },
    { v: completedCount.toString(), l: "Jobs completed" },
    { v: totalUSDC + " USDC", l: "Settled onchain" },
    { v: fastestMs + "ms", l: "Fastest settlement" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "#e8e4de", borderRadius: "16px", overflow: "hidden", marginBottom: "64px", border: "1px solid #e8e4de" }}>
      {stats.map((s) => (
        <div key={s.l} style={{ background: "white", padding: "24px 28px" }}>
          <p style={{ color: "#1c1917", fontSize: "26px", fontWeight: 800, letterSpacing: "-1px", marginBottom: "4px" }}>{s.v}</p>
          <p style={{ color: "#a8a29e", fontSize: "12px", fontWeight: 500 }}>{s.l}</p>
        </div>
      ))}
    </div>
  );
}

function ActivityFeed() {
  const activity = [
    { id: "23", action: "completed", description: "Tokenomics model for Layer-2 gaming protocol", settleMs: 441, date: "Apr 11, 2026", budget: "10" },
    { id: "22", action: "completed", description: "Frontend dashboard for RWA tokenization protocol", settleMs: 387, date: "Apr 11, 2026", budget: "10" },
    { id: "21", action: "completed", description: "Smart contract audit for ArcJobs escrow protocol", settleMs: 412, date: "Apr 11, 2026", budget: "10" },
    { id: "20", action: "posted", description: "Solana protocol needs community manager for daily engagement", date: "Apr 4, 2026", budget: "2000" },
    { id: "19", action: "posted", description: "Layer-2 gaming protocol needs tokenomics for supply and vesting", date: "Apr 3, 2026", budget: "3900" },
  ];

  return (
    <div style={{ marginBottom: "64px" }}>
      <p style={{ color: "#a8a29e", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "20px" }}>Recent activity</p>
      <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        {activity.map((item, i) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < activity.length - 1 ? "1px solid #f0ede9" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: item.action === "completed" ? "#f0fdf4" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "14px" }}>{item.action === "completed" ? "✓" : "+"}</span>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "2px" }}>
                  <span style={{ color: "#c8c4be", fontSize: "10px", fontFamily: "monospace", fontWeight: 600 }}>#{item.id}</span>
                  <span style={{ background: item.action === "completed" ? "#f0fdf4" : "#eff6ff", color: item.action === "completed" ? "#16a34a" : "#2563eb", fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "99px" }}>
                    {item.action === "completed" ? "Completed" : "Posted"}
                  </span>
                  {item.settleMs && (
                    <span style={{ color: "#16a34a", fontSize: "10px", fontWeight: 700 }}>⚡ {item.settleMs}ms</span>
                  )}
                </div>
                <p style={{ color: "#44403c", fontSize: "12px", fontWeight: 500, lineHeight: 1.3 }}>
                  {item.description.length > 60 ? item.description.slice(0, 60) + "…" : item.description}
                </p>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "16px" }}>
              <p style={{ color: item.action === "completed" ? "#16a34a" : "#1c1917", fontSize: "13px", fontWeight: 700 }}>{item.budget} USDC</p>
              <p style={{ color: "#c8c4be", fontSize: "10px" }}>{item.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectedStats() {
  const { data: jobCounter } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "jobCounter",
  }) as { data: bigint | undefined };

  const totalJobs = jobCounter ? Number(jobCounter) : 23;
  const completedCount = Object.keys(COMPLETED_JOBS).length;
  const fastestMs = Math.min(...Object.values(COMPLETED_JOBS).map(j => j.settleMs));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "28px" }}>
      {[
        { v: totalJobs.toString(), l: "Jobs onchain" },
        { v: completedCount.toString(), l: "Completed" },
        { v: (completedCount * 10) + " USDC", l: "Settled" },
        { v: fastestMs + "ms", l: "Fastest" },
      ].map((s) => (
        <div key={s.l} style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: "10px", padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <p style={{ color: "#1c1917", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "2px" }}>{s.v}</p>
          <p style={{ color: "#a8a29e", fontSize: "11px", fontWeight: 500 }}>{s.l}</p>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [activeTab, setActiveTab] = useState<"board" | "post">("board");

  const goToBoard = () => {
    setActiveTab("board");
    if (!isConnected) {
      const el = document.getElementById("connect-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const goHome = () => {
    setActiveTab("board");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f8f7f4", fontFamily: "Inter, -apple-system, sans-serif" }}>

      {/* NAV */}
      <nav style={{ background: "rgba(248,247,244,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e8e4de", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <button onClick={goHome} style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
            <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
              <span style={{ color: "white", fontSize: "13px", fontWeight: 800 }}>AJ</span>
            </div>
            <div style={{ textAlign: "left" }}>
              <span style={{ color: "#1c1917", fontWeight: 700, fontSize: "15px", letterSpacing: "-0.3px" }}>ArcJobs</span>
              <span style={{ color: "#a8a29e", fontSize: "11px", marginLeft: "6px" }}>testnet</span>
            </div>
          </button>
          <div style={{ display: "flex", gap: "4px" }}>
            {["Explorer", "Contract"].map((item) => (
              <a key={item} href={item === "Explorer" ? "https://testnet.arcscan.app" : "https://testnet.arcscan.app/address/0x63cEc4e9AeA0F94E149C9df598c54DdB2C5128c7"} target="_blank" rel="noopener noreferrer" style={{ color: "#78716c", fontSize: "13px", fontWeight: 500, padding: "6px 10px", borderRadius: "6px", textDecoration: "none" }}>
                {item}
              </a>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isConnected ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "white", border: "1px solid #e7e5e4", borderRadius: "8px", padding: "7px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }}></div>
                <span style={{ color: "#44403c", fontSize: "12px", fontFamily: "monospace", fontWeight: 500 }}>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
              <button onClick={() => disconnect()} style={{ background: "white", border: "1px solid #e7e5e4", color: "#78716c", fontSize: "12px", fontWeight: 500, padding: "7px 14px", borderRadius: "8px", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                Disconnect
              </button>
            </>
          ) : (
            <button onClick={() => connect({ connector: injected() })} style={{ background: "#6366f1", color: "white", border: "none", fontSize: "13px", fontWeight: 600, padding: "9px 18px", borderRadius: "9px", cursor: "pointer", boxShadow: "0 2px 8px rgba(99,102,241,0.35)", letterSpacing: "-0.2px" }}>
              Connect wallet
            </button>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 32px" }}>
        {!isConnected ? (
          <div>
            {/* Hero */}
            <div style={{ paddingTop: "72px", paddingBottom: "64px", maxWidth: "680px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "white", border: "1px solid #e7e5e4", borderRadius: "99px", padding: "5px 12px", marginBottom: "28px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }}></div>
                <span style={{ color: "#78716c", fontSize: "11px", fontWeight: 600, letterSpacing: "0.3px" }}>LIVE ON ARC TESTNET · ERC-8183</span>
              </div>
              <h1 style={{ fontSize: "56px", fontWeight: 800, color: "#1c1917", lineHeight: 1.05, marginBottom: "20px", letterSpacing: "-2px" }}>
                Freelance work,<br />
                <span style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>paid by code.</span>
              </h1>
              <p style={{ color: "#78716c", fontSize: "18px", lineHeight: 1.65, marginBottom: "36px", maxWidth: "520px" }}>
                Post a job, lock USDC in an ERC-8183 escrow contract on Arc, release payment the moment work is approved. No platform fees. No middlemen. 0.4 second finality.
              </p>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button onClick={goToBoard} style={{ background: "#6366f1", color: "white", border: "none", fontSize: "15px", fontWeight: 700, padding: "14px 28px", borderRadius: "12px", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.35)", letterSpacing: "-0.3px" }}>
                  Start hiring →
                </button>
                <a href="https://testnet.arcscan.app/address/0x63cEc4e9AeA0F94E149C9df598c54DdB2C5128c7" target="_blank" rel="noopener noreferrer" style={{ color: "#78716c", fontSize: "14px", fontWeight: 500, textDecoration: "none" }}>
                  View contract →
                </a>
              </div>
            </div>

            {/* Live stats */}
            <LiveStats />

            {/* Activity feed */}
            <ActivityFeed />

            {/* How it works */}
            <div style={{ marginBottom: "64px" }}>
              <p style={{ color: "#a8a29e", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "28px" }}>How it works</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                {[
                  { n: "01", title: "Post a job", body: "Describe the work, set your USDC budget, assign a provider wallet. The job is created onchain in one transaction.", color: "#6366f1" },
                  { n: "02", title: "USDC goes into escrow", body: "You fund the job. USDC locks in the ERC-8183 smart contract on Arc. Neither party can move it until the job resolves.", color: "#8b5cf6" },
                  { n: "03", title: "Provider submits work", body: "The freelancer marks work done. The deliverable hash is stored onchain. You get a clear signal it's ready for review.", color: "#6366f1" },
                  { n: "04", title: "Approve and release", body: "You approve. USDC transfers to the provider in under half a second. No bank. No platform. Just Arc.", color: "#8b5cf6" },
                ].map((s) => (
                  <div key={s.n} style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <span style={{ background: s.color, color: "white", fontSize: "10px", fontWeight: 800, padding: "3px 8px", borderRadius: "6px" }}>{s.n}</span>
                      <p style={{ color: "#1c1917", fontSize: "15px", fontWeight: 700, letterSpacing: "-0.3px" }}>{s.title}</p>
                    </div>
                    <p style={{ color: "#78716c", fontSize: "13px", lineHeight: 1.65 }}>{s.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Arc */}
            <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: "18px", padding: "40px", marginBottom: "64px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center" }}>
              <div>
                <p style={{ color: "#a8a29e", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "14px" }}>Built on Arc</p>
                <h3 style={{ color: "#1c1917", fontSize: "26px", fontWeight: 800, lineHeight: 1.2, marginBottom: "14px", letterSpacing: "-0.8px" }}>
                  The only freelance platform where the contract is the platform.
                </h3>
                <p style={{ color: "#78716c", fontSize: "14px", lineHeight: 1.7 }}>
                  Arc is Circle's Layer-1 blockchain built for stablecoin finance. USDC is the gas token — no volatile crypto needed. Every payment settles deterministically in under 500ms. ArcJobs is the first freelance marketplace built natively on ERC-8183, the new onchain work standard.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { icon: "⚡", title: "Sub-second finality", body: "Malachite consensus engine. Deterministic. No waiting for block confirmations." },
                  { icon: "🔒", title: "Trustless escrow", body: "ERC-8183 standard. Funds release only when you approve. Refundable on expiry." },
                  { icon: "💵", title: "USDC gas", body: "No ETH, no volatile tokens. Gas fees paid in the same asset you're sending." },
                ].map((f) => (
                  <div key={f.title} style={{ display: "flex", gap: "12px", background: "#f8f7f4", borderRadius: "10px", padding: "14px 16px" }}>
                    <span style={{ fontSize: "18px" }}>{f.icon}</span>
                    <div>
                      <p style={{ color: "#1c1917", fontSize: "13px", fontWeight: 700, marginBottom: "2px" }}>{f.title}</p>
                      <p style={{ color: "#78716c", fontSize: "12px", lineHeight: 1.5 }}>{f.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div id="connect-section" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: "18px", padding: "48px", marginBottom: "64px", textAlign: "center" }}>
              <h3 style={{ color: "white", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.8px", marginBottom: "10px" }}>Ready to hire onchain?</h3>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "15px", marginBottom: "28px" }}>Connect your wallet and post your first job in 60 seconds.</p>
              <button onClick={() => connect({ connector: injected() })} style={{ background: "white", color: "#6366f1", border: "none", fontSize: "14px", fontWeight: 700, padding: "13px 28px", borderRadius: "10px", cursor: "pointer" }}>
                Connect wallet
              </button>
            </div>
          </div>
        ) : (
          <div style={{ paddingTop: "36px" }}>
            {/* Connected stats */}
            <ConnectedStats />

            <div style={{ display: "flex", gap: "3px", marginBottom: "32px", background: "white", border: "1px solid #e7e5e4", borderRadius: "10px", padding: "4px", width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {(["board", "post"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "8px 20px", borderRadius: "7px", fontSize: "13px", fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.15s", background: activeTab === tab ? "#6366f1" : "transparent", color: activeTab === tab ? "white" : "#78716c", boxShadow: activeTab === tab ? "0 2px 6px rgba(99,102,241,0.3)" : "none" }}>
                  {tab === "board" ? "Job board" : "Post a job"}
                </button>
              ))}
            </div>
            {activeTab === "board" ? <JobBoard /> : <PostJob onSuccess={() => setActiveTab("board")} />}
          </div>
        )}
      </div>

      <footer style={{ borderTop: "1px solid #e8e4de", padding: "24px 32px", marginTop: "40px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "#a8a29e", fontSize: "12px" }}>ArcJobs · ERC-8183 escrow on Arc testnet</p>
          <p style={{ color: "#c8c4be", fontSize: "11px", fontFamily: "monospace" }}>contract: 0x63cec4e9...5128c7</p>
        </div>
      </footer>
    </main>
  );
}
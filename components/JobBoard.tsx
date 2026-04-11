"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI, USDC_ADDRESS, USDC_ABI, JOB_STATUS } from "@/lib/contract";
import { formatUnits, keccak256, toBytes } from "viem";

type Job = { id: bigint; client: string; provider: string; evaluator: string; description: string; budget: bigint; expiredAt: bigint; status: number; hook: string; };

// Real completed jobs — #21, #22, #23 completed onchain April 11 2026
const COMPLETED_JOBS: Record<string, { completedAt: string; txHash: string; settleMs: number }> = {
  "21": {
    completedAt: "Apr 11, 2026 · 11:22 UTC",
    txHash: "0xbdb0b553978c9022b5d43d5716d7797f3b70862ef2493c8639d856b9f8448962",
    settleMs: 412,
  },
  "22": {
    completedAt: "Apr 11, 2026 · 11:24 UTC",
    txHash: "0x33521a38b8a38b49d756dd63d46aaac58e43c5c6f981b7c2d81e8d6648b7c923",
    settleMs: 387,
  },
  "23": {
    completedAt: "Apr 11, 2026 · 11:26 UTC",
    txHash: "0x1c9944b8f0dcf5d8be3df8010aeec22aec730d9e15bca54d692fdefd4347b9fc",
    settleMs: 441,
  },
};

// Richer detail text shown in the job detail view (onchain description stays on card)
const JOB_DETAILS: Record<string, { scope: string; requirements: string; deliverable: string }> = {
  "1": {
    scope: "Cross-chain bridge needs a technical writer who can explain Solidity mechanics without dumbing it down. The docs currently assume too much and lose readers at the bridge architecture section.",
    requirements: "Previous Web3 docs portfolio required. You should be comfortable reading contracts directly and translating what they do into plain language. No ghostwriting — your name goes on the work.",
    deliverable: "Full API reference plus two explainer guides. One for integrators, one for end users. Format: MDX, ready to drop into Docusaurus.",
  },
  "2": {
    scope: "NFT marketplace on Arbitrum needs a full security audit before mainnet launch. Three core contracts: marketplace, royalty splitter, and an escrow module. About 800 lines of Solidity total.",
    requirements: "Prior audit reports required, specifically ERC-721 or marketplace contracts. Must use Slither and Foundry invariant tests as part of the process. Report format: executive summary plus line-by-line findings.",
    deliverable: "Audit report with severity ratings, PoC exploits for any critical or high findings, and a re-audit confirmation after fixes.",
  },
  "3": {
    scope: "DeFi protocol launching on Base needs a React dashboard that reads live contract state. Current setup is a raw ethers.js script — nobody wants to run that to check positions.",
    requirements: "wagmi v2, React 18, TypeScript. Must handle wallet connect, live balance reads, and a transaction history table. Mobile responsive.",
    deliverable: "Deployed frontend with source code. Design reference provided in Figma.",
  },
  "4": {
    scope: "Yield aggregator needs tokenomics before the TGE. Currently the team has a spreadsheet with vesting schedules but nothing that models emission curves, staking incentives, or long-term sell pressure.",
    requirements: "Must show your work. Deliver the model in a format the team can stress-test themselves — not just a PDF with conclusions.",
    deliverable: "Full tokenomics model in Google Sheets or Excel, plus a 10-page paper explaining the design decisions. Two revision rounds included.",
  },
  "5": {
    scope: "Solana-based DEX needs a Rust developer to build the order matching engine. Current architecture uses a basic AMM; the team wants a hybrid model with a CLOB for large trades.",
    requirements: "Production Rust experience required. Anchor framework. Prior DEX or order book work preferred — this isn't a learning project.",
    deliverable: "Working on-chain program with tests, benchmarks showing latency under load, and integration docs for the frontend team.",
  },
  "6": {
    scope: "DAO governance portal needs a complete UI redesign. The current interface was built fast and it shows — low proposal participation, members say it's confusing.",
    requirements: "Figma deliverables first, implementation second. Must design for both light and dark mode. Wallet connect, proposal voting, and treasury view are the three core flows.",
    deliverable: "Figma file with component library plus implemented Next.js frontend. Handoff includes Storybook.",
  },
  "7": {
    scope: "DeFi lending protocol on Arc needs three core Solidity contracts: lending pool, rewards distributor, and oracle integration. Prior audited contracts required — this goes to mainnet.",
    requirements: "Must have shipped audited DeFi contracts before. Show the audit reports. Foundry test suite required with 95%+ coverage.",
    deliverable: "Contracts, full test suite, deployment scripts, and NatSpec docs. Integration guide for the frontend team included.",
  },
  "8": {
    scope: "L2 gaming protocol needs a Rust backend that handles real-time game state. Players make moves onchain but the UX requires sub-100ms feedback before confirmation.",
    requirements: "Rust, WebSockets, familiarity with optimistic UI patterns. Gaming or high-frequency trading background preferred.",
    deliverable: "Running backend service with load test results. Docker container plus deployment docs.",
  },
  "9": {
    scope: "DeFi protocol whitepaper — the team has a working product but the paper reads like it was written by engineers for engineers. It needs to communicate clearly to investors and non-technical validators.",
    requirements: "DeFi writing background required. Must understand AMMs, liquidity pools, and yield mechanics well enough to explain them accurately. No fluff.",
    deliverable: "Revised whitepaper (20-30 pages), an executive summary (2 pages), and a one-page explainer for validators.",
  },
  "10": {
    scope: "NFT collection brand identity from scratch. 10,000-piece generative collection launching on Ethereum. The team has the art direction but nothing designed yet — no logo, no color system, no typography.",
    requirements: "Portfolio of Web3 brand work required. Must understand how brand assets get used across Twitter, Discord, and OpenSea. Fast turnaround needed.",
    deliverable: "Logo suite, full brand guidelines, Discord server art, Twitter banner, and OpenSea collection assets.",
  },
  "11": {
    scope: "Cross-chain bridge smart contract audit. Two contracts: the bridge itself and a liquidity manager. About 600 lines. Previous bridge audits have missed reentrancy issues in similar architectures — flag anything in that family hard.",
    requirements: "Bridge audit experience specifically. Show prior reports. Must include fork testing against mainnet state.",
    deliverable: "Full audit report, PoC exploits for critical/high findings, and availability for a re-audit call after fixes.",
  },
  "12": {
    scope: "Web3 education platform needs 8 weeks of video content on DeFi fundamentals. 60 to 90 seconds per video, crypto-native aesthetic, weekly cadence.",
    requirements: "Must be deep in crypto Twitter and understand the current DeFi meta. Show previous short-form content. Fast turnaround matters more than perfection here.",
    deliverable: "8 edited videos delivered weekly, raw files included, plus captions for each.",
  },
  "13": {
    scope: "Solana NFT marketplace needs a new minting UI. Current flow drops users at the wallet confirmation step — conversion is terrible. The contract is done; this is a frontend-only job.",
    requirements: "React, wallet adapter, experience with Metaplex. Must handle failed transactions gracefully. Mobile first.",
    deliverable: "Deployed frontend with source. Includes loading states, error handling, and a post-mint success screen.",
  },
  "14": {
    scope: "DeFi protocol community management across Discord and Telegram. Daily engagement, weekly AMAs, and responding to support questions. The community is active and technical — surface-level answers won't work.",
    requirements: "Must be genuinely deep in DeFi. Previous community work for a protocol with 5k+ members. Show examples of how you've handled FUD or exploit announcements.",
    deliverable: "30-day trial with daily activity reports and weekly engagement metrics.",
  },
  "15": {
    scope: "DEX on Avalanche needs a full security audit before a $2M liquidity bootstrap. Three contracts: AMM core, fee distributor, and a time-locked admin module.",
    requirements: "AMM audit experience required. Echidna or Foundry invariant testing as part of the process. Report within 10 days.",
    deliverable: "Audit report with severity breakdown, invariant test suite, and a fix-review session.",
  },
  "16": {
    scope: "GameFi protocol needs a full token model before a Series A raise. The investors will stress-test it — it needs to hold up to questions about inflation, sink mechanics, and long-term player incentives.",
    requirements: "GameFi tokenomics specifically. Show models you've built that shipped. Agent-based simulation of player behavior preferred.",
    deliverable: "Full model, simulation results, investor-facing presentation, and a 30-minute walkthrough call.",
  },
  "17": {
    scope: "Ethereum L2 needs a KOL marketing campaign for the mainnet launch. Budget is set; need someone who knows which accounts actually drive developer adoption versus retail hype.",
    requirements: "Proven track record with L2 or DeFi protocol launches. Show campaigns you've run and what the actual results were.",
    deliverable: "Campaign plan, KOL outreach and agreements, execution across 4 weeks, and a post-campaign report.",
  },
  "18": {
    scope: "Cross-chain protocol needs a React frontend for their bridge. Users select source chain, destination chain, token, and amount. The hard part: showing accurate fee estimates and wait times before the user commits.",
    requirements: "wagmi, ethers.js, experience with multi-chain state. Must have built a bridge UI before or something with similar complexity.",
    deliverable: "Deployed frontend with source. Includes fee estimation, transaction status tracking, and history view.",
  },
  "19": {
    scope: "Layer-2 gaming protocol needs a full tokenomics model: supply schedule, vesting, liquidity incentives, and staking emissions. The game launches in 6 weeks.",
    requirements: "Gaming tokenomics specifically. The model needs to account for both player behavior and investor unlock schedules without creating sell cliffs.",
    deliverable: "Full model, 10-page paper, and a presentation for the investor update.",
  },
  "20": {
    scope: "Solana protocol needs a community manager who's actually deep in crypto Twitter. Daily engagement, AMAs twice a month, and growing the account from 8k to 25k followers in 90 days.",
    requirements: "Must have grown a crypto account before and have proof. Understand the culture well enough to post without approval on most things.",
    deliverable: "90-day engagement plan, weekly reports, and a final growth analysis.",
  },
  "21": {
    scope: "Full security audit of the ArcJobs ERC-8183 escrow protocol. Covers the complete job lifecycle: createJob, fund, submit, complete, and reject. Special attention on reentrancy vectors in the fund and complete flows.",
    requirements: "ERC-8183 familiarity preferred. Must review the proxy/implementation architecture and check for storage collision risks. Foundry invariant tests required.",
    deliverable: "Audit report delivered April 10. No critical or high vulnerabilities found. Full report with recommendations submitted and approved by client.",
  },
  "22": {
    scope: "React and wagmi frontend for an RWA tokenization protocol. Dashboard shows live token positions, underlying asset data pulled from an oracle, and a redemption flow.",
    requirements: "wagmi v2, TypeScript, mobile responsive. Must handle the case where oracle data is stale — show a clear warning rather than silently showing bad numbers.",
    deliverable: "Deployed dashboard with full wallet connect, position tracking, and redemption flow. All mobile breakpoints tested.",
  },
  "23": {
    scope: "Tokenomics model for a Layer-2 gaming protocol. Supply curve, vesting schedules, staking emission design, and a 10-page paper explaining the decisions.",
    requirements: "Must model player behavior as a variable, not a constant. Show what happens to token price under three different adoption scenarios.",
    deliverable: "Full spreadsheet model, scenario analysis, and 10-page paper. Client approved and implementation started.",
  },
};

const STATUS_STYLES: Record<number, { bg: string; color: string; border: string; label: string }> = {
  0: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", label: "Open" },
  1: { bg: "#fffbeb", color: "#d97706", border: "#fde68a", label: "Funded" },
  2: { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe", label: "Submitted" },
  3: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: "Completed" },
  4: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Rejected" },
  5: { bg: "#f5f5f4", color: "#78716c", border: "#e7e5e4", label: "Expired" },
};

const CATEGORIES: Record<string, { label: string; bg: string; color: string }> = {
  audit: { label: "Audit", bg: "#fef2f2", color: "#dc2626" },
  frontend: { label: "Frontend", bg: "#eff6ff", color: "#2563eb" },
  solidity: { label: "Solidity", bg: "#f5f3ff", color: "#7c3aed" },
  design: { label: "Design", bg: "#fff7ed", color: "#c2410c" },
  tokenomics: { label: "Tokenomics", bg: "#fdf4ff", color: "#9333ea" },
  community: { label: "Community", bg: "#f0fdf4", color: "#16a34a" },
  writing: { label: "Writing", bg: "#fffbeb", color: "#d97706" },
  backend: { label: "Backend", bg: "#f0f9ff", color: "#0369a1" },
  marketing: { label: "Marketing", bg: "#fdf2f8", color: "#9d174d" },
  other: { label: "Other", bg: "#f5f5f4", color: "#78716c" },
};

function getCategory(description: string) {
  const d = description.toLowerCase();
  if (d.includes("audit")) return CATEGORIES.audit;
  if (d.includes("frontend") || d.includes("react") || d.includes("dashboard") || d.includes("ui")) return CATEGORIES.frontend;
  if (d.includes("solidity") || d.includes("smart contract") || d.includes("evm")) return CATEGORIES.solidity;
  if (d.includes("design") || d.includes("figma") || d.includes("brand") || d.includes("logo")) return CATEGORIES.design;
  if (d.includes("tokenomics") || d.includes("token")) return CATEGORIES.tokenomics;
  if (d.includes("community") || d.includes("discord") || d.includes("telegram")) return CATEGORIES.community;
  if (d.includes("writing") || d.includes("whitepaper") || d.includes("docs") || d.includes("technical")) return CATEGORIES.writing;
  if (d.includes("backend") || d.includes("api") || d.includes("node") || d.includes("rust")) return CATEGORIES.backend;
  if (d.includes("marketing") || d.includes("growth") || d.includes("kol")) return CATEGORIES.marketing;
  return CATEGORIES.other;
}

function JobDetail({ job, userAddress, onBack }: { job: Job; userAddress: string; onBack: () => void }) {
  const [txHash, setTxHash] = useState("");
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);
  const [settleTime, setSettleTime] = useState<number | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: jobData, refetch } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getJob",
    args: [job.id],
  }) as { data: Job | undefined; refetch: () => void };
  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [userAddress as `0x${string}`, MARKETPLACE_ADDRESS],
  }) as { data: bigint | undefined };

  const currentJob = jobData || job;
  const isClient = userAddress.toLowerCase() === currentJob.client.toLowerCase();
  const isProvider = userAddress.toLowerCase() === currentJob.provider.toLowerCase();
  const isEvaluator = userAddress.toLowerCase() === currentJob.evaluator.toLowerCase();
  const st = STATUS_STYLES[currentJob.status] || STATUS_STYLES[5];
  const cat = getCategory(currentJob.description);
  const deadline = new Date(Number(currentJob.expiredAt) * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const details = JOB_DETAILS[currentJob.id.toString()];
  const completedData = COMPLETED_JOBS[currentJob.id.toString()];

  const handleFund = async () => {
    try {
      setSettling(true);
      const start = Date.now();
      if (!allowance || allowance < currentJob.budget) {
        await writeContractAsync({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: "approve", args: [MARKETPLACE_ADDRESS, currentJob.budget] });
        await new Promise((r) => setTimeout(r, 2000));
      }
      const tx = await writeContractAsync({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "fund", args: [currentJob.id, "0x"] });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: tx });
      setSettleTime(Number(((Date.now() - start) / 1000).toFixed(1)));
      setTxHash(tx); setSettled(true); refetch();
    } catch (e) { console.error(e); } finally { setSettling(false); }
  };

  const handleSubmit = async () => {
    try {
      setSettling(true);
      const deliverable = keccak256(toBytes("job-" + currentJob.id + "-" + Date.now()));
      const tx = await writeContractAsync({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "submit", args: [currentJob.id, deliverable, "0x"] });
      setTxHash(tx); refetch();
    } catch (e) { console.error(e); } finally { setSettling(false); }
  };

  const handleComplete = async () => {
    try {
      setSettling(true);
      const start = Date.now();
      const tx = await writeContractAsync({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "complete", args: [currentJob.id, "0x0000000000000000000000000000000000000000000000000000000000000000", "0x"] });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: tx });
      setSettleTime(Number(((Date.now() - start) / 1000).toFixed(1)));
      setTxHash(tx); setSettled(true); refetch();
    } catch (e) { console.error(e); } finally { setSettling(false); }
  };

  const handleReject = async () => {
    try {
      setSettling(true);
      const tx = await writeContractAsync({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "reject", args: [currentJob.id, "0x0000000000000000000000000000000000000000000000000000000000000000", "0x"] });
      setTxHash(tx); refetch();
    } catch (e) { console.error(e); } finally { setSettling(false); }
  };

  return (
    <div style={{ maxWidth: "680px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#78716c", fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: "0 0 24px 0", display: "flex", alignItems: "center", gap: "6px" }}>
        ← Back to board
      </button>

      <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: "18px", padding: "32px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: "16px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <span style={{ color: "#c8c4be", fontSize: "12px", fontFamily: "monospace", fontWeight: 600 }}>{"#" + currentJob.id.toString()}</span>
          <span style={{ background: st.bg, color: st.color, border: "1px solid " + st.border, fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "99px" }}>{st.label}</span>
          <span style={{ background: cat.bg, color: cat.color, fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "99px" }}>{cat.label}</span>
        </div>

        <p style={{ color: "#1c1917", fontSize: "18px", fontWeight: 700, lineHeight: 1.5, marginBottom: "16px", letterSpacing: "-0.3px" }}>{currentJob.description}</p>

        {/* Rich detail sections */}
        {details && (
          <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ background: "#f8f7f4", borderRadius: "12px", padding: "16px" }}>
              <p style={{ color: "#a8a29e", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Scope</p>
              <p style={{ color: "#44403c", fontSize: "13px", lineHeight: 1.6 }}>{details.scope}</p>
            </div>
            <div style={{ background: "#f8f7f4", borderRadius: "12px", padding: "16px" }}>
              <p style={{ color: "#a8a29e", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Requirements</p>
              <p style={{ color: "#44403c", fontSize: "13px", lineHeight: 1.6 }}>{details.requirements}</p>
            </div>
            <div style={{ background: "#f8f7f4", borderRadius: "12px", padding: "16px" }}>
              <p style={{ color: "#a8a29e", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Deliverable</p>
              <p style={{ color: "#44403c", fontSize: "13px", lineHeight: 1.6 }}>{details.deliverable}</p>
            </div>
          </div>
        )}

        {/* Budget + Deadline */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
          <div style={{ background: "#f8f7f4", borderRadius: "12px", padding: "16px" }}>
            <p style={{ color: "#a8a29e", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Budget</p>
            <p style={{ color: "#1c1917", fontSize: "28px", fontWeight: 800, letterSpacing: "-1px" }}>{formatUnits(currentJob.budget, 6)}</p>
            <p style={{ color: "#a8a29e", fontSize: "12px", fontWeight: 600 }}>USDC</p>
          </div>
          <div style={{ background: "#f8f7f4", borderRadius: "12px", padding: "16px" }}>
            <p style={{ color: "#a8a29e", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Deadline</p>
            <p style={{ color: "#1c1917", fontSize: "15px", fontWeight: 700, marginTop: "6px" }}>{deadline}</p>
            <p style={{ color: "#a8a29e", fontSize: "12px" }}>expiry date</p>
          </div>
        </div>

        {/* Addresses */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
          {[["Client", currentJob.client, isClient], ["Provider", currentJob.provider, isProvider], ["Evaluator", currentJob.evaluator, isEvaluator]].map(([label, addr, isYou]) => (
            <div key={label as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8f7f4", borderRadius: "8px" }}>
              <span style={{ color: "#a8a29e", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label as string}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isYou && <span style={{ background: "#eef2ff", color: "#6366f1", fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>YOU</span>}
                <a href={"https://testnet.arcscan.app/address/" + addr} target="_blank" rel="noopener noreferrer" style={{ color: "#44403c", fontSize: "12px", fontFamily: "monospace", textDecoration: "none" }}>
                  {(addr as string).slice(0, 8)}...{(addr as string).slice(-6)}
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Completed payment panel */}
        {currentJob.status === 3 && (
          <div style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1px solid #86efac", borderRadius: "14px", padding: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: "28px", height: "28px", background: "#16a34a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p style={{ color: "#15803d", fontSize: "14px", fontWeight: 700 }}>Payment released</p>
                <p style={{ color: "#16a34a", fontSize: "12px" }}>{completedData ? completedData.completedAt : "Settled on Arc testnet"}</p>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <p style={{ color: "#15803d", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>{formatUnits(currentJob.budget, 6)} USDC</p>
                <p style={{ color: "#16a34a", fontSize: "11px" }}>released to provider</p>
              </div>
            </div>

            {/* Settlement time badge */}
            {completedData && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(22,163,74,0.1)", borderRadius: "99px", padding: "4px 12px", marginBottom: "12px" }}>
                <span style={{ color: "#15803d", fontSize: "16px", fontWeight: 900, fontFamily: "monospace" }}>{completedData.settleMs}ms</span>
                <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 600 }}>settlement on Arc</span>
              </div>
            )}

            <div style={{ borderTop: "1px solid #bbf7d0", paddingTop: "12px", display: "flex", gap: "8px" }}>
              {completedData && (
                <a href={"https://testnet.arcscan.app/tx/" + completedData.txHash} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: "white", border: "1px solid #86efac", borderRadius: "8px", padding: "8px 12px", textAlign: "center", color: "#16a34a", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
                  View tx on ArcScan →
                </a>
              )}
              <a href={"https://testnet.arcscan.app/address/" + MARKETPLACE_ADDRESS} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: "white", border: "1px solid #86efac", borderRadius: "8px", padding: "8px 12px", textAlign: "center", color: "#16a34a", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
                View contract →
              </a>
            </div>
          </div>
        )}

        {settled && settleTime && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ color: "#16a34a", fontSize: "13px", fontWeight: 600 }}>Settled on Arc</span>
            <span style={{ color: "#16a34a", fontSize: "18px", fontFamily: "monospace", fontWeight: 800 }}>{settleTime}s</span>
          </div>
        )}

        {txHash && (
          <a href={"https://testnet.arcscan.app/tx/" + txHash} target="_blank" rel="noopener noreferrer" style={{ display: "block", color: "#6366f1", fontSize: "12px", fontFamily: "monospace", textDecoration: "none", fontWeight: 600, marginBottom: "16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            {txHash.slice(0, 36)}... → ArcScan
          </a>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px" }}>
          {isClient && currentJob.status === 0 && (
            <button onClick={handleFund} disabled={settling} style={{ flex: 1, background: "#6366f1", color: "white", border: "none", fontSize: "14px", fontWeight: 700, padding: "13px 16px", borderRadius: "10px", cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.6 : 1, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
              {settling ? "Funding..." : "Fund " + formatUnits(currentJob.budget, 6) + " USDC"}
            </button>
          )}
          {isProvider && currentJob.status === 1 && (
            <button onClick={handleSubmit} disabled={settling} style={{ flex: 1, background: "#6366f1", color: "white", border: "none", fontSize: "14px", fontWeight: 700, padding: "13px 16px", borderRadius: "10px", cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.6 : 1 }}>
              {settling ? "Submitting..." : "Submit work"}
            </button>
          )}
          {isEvaluator && currentJob.status === 2 && (
            <>
              <button onClick={handleComplete} disabled={settling} style={{ flex: 1, background: "#16a34a", color: "white", border: "none", fontSize: "14px", fontWeight: 700, padding: "13px 16px", borderRadius: "10px", cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.6 : 1 }}>
                {settling ? "Releasing..." : "Approve & release"}
              </button>
              <button onClick={handleReject} disabled={settling} style={{ flex: 1, background: "white", color: "#dc2626", border: "1px solid #fecaca", fontSize: "14px", fontWeight: 700, padding: "13px 16px", borderRadius: "10px", cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.6 : 1 }}>
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function JobCard({ jobId, userAddress, onClick }: { jobId: bigint; userAddress: string; onClick: (job: Job) => void }) {
  const { data: job } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getJob",
    args: [jobId],
  }) as { data: Job | undefined };

  if (!job || job.id === 0n) return null;

  const st = STATUS_STYLES[job.status] || STATUS_STYLES[5];
  const cat = getCategory(job.description);
  const deadline = new Date(Number(job.expiredAt) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const isCompleted = job.status === 3;
  const completedData = COMPLETED_JOBS[job.id.toString()];

  return (
    <div
      onClick={() => onClick(job)}
      style={{ background: "white", border: "1px solid " + (isCompleted ? "#bbf7d0" : "#e7e5e4"), borderRadius: "14px", padding: "20px 24px", boxShadow: isCompleted ? "0 1px 4px rgba(22,163,74,0.08)" : "0 1px 4px rgba(0,0,0,0.04)", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: "12px" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = isCompleted ? "0 1px 4px rgba(22,163,74,0.08)" : "0 1px 4px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", flexWrap: "wrap" as const }}>
            <span style={{ color: "#c8c4be", fontSize: "11px", fontFamily: "monospace", fontWeight: 600 }}>{"#" + job.id.toString()}</span>
            <span style={{ background: st.bg, color: st.color, border: "1px solid " + st.border, fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px" }}>{st.label}</span>
            <span style={{ background: cat.bg, color: cat.color, fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px" }}>{cat.label}</span>
            {isCompleted && completedData && (
              <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px" }}>⚡ {completedData.settleMs}ms</span>
            )}
          </div>
          <p style={{ color: "#1c1917", fontSize: "14px", fontWeight: 600, lineHeight: 1.4, letterSpacing: "-0.2px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{job.description}</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, background: isCompleted ? "#f0fdf4" : "#f8f7f4", borderRadius: "10px", padding: "10px 14px", minWidth: "90px" }}>
          <p style={{ color: isCompleted ? "#16a34a" : "#1c1917", fontSize: "19px", fontWeight: 800, letterSpacing: "-0.5px" }}>{formatUnits(job.budget, 6)}</p>
          <p style={{ color: "#a8a29e", fontSize: "10px", fontWeight: 600 }}>USDC</p>
          <p style={{ color: "#a8a29e", fontSize: "10px", marginTop: "2px" }}>{deadline}</p>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#a8a29e", fontSize: "11px", fontFamily: "monospace" }}>
          {job.client.slice(0, 6)}...{job.client.slice(-4)}
        </span>
        <span style={{ color: "#c8c4be", fontSize: "12px" }}>{isCompleted ? "View receipt →" : "View details →"}</span>
      </div>
    </div>
  );
}

function FilteredJobCard({ jobId, userAddress, filter, onClick }: { jobId: bigint; userAddress: string; filter: string; onClick: (job: Job) => void }) {
  const { data: job } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getJob",
    args: [jobId],
  }) as { data: Job | undefined };

  if (!job || job.id === 0n) return null;
  if (filter === "open" && job.status !== 0) return null;
  if (filter === "completed" && job.status !== 3) return null;

  return <JobCard jobId={jobId} userAddress={userAddress} onClick={onClick} />;
}

export default function JobBoard() {
  const { address } = useAccount();
  const [jobIds, setJobIds] = useState<bigint[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "completed">("all");

  const { data: jobCounter } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "jobCounter",
  }) as { data: bigint | undefined };

  useEffect(() => {
    if (jobCounter && jobCounter > 0n) {
      const ids = [];
      for (let i = 1n; i <= jobCounter; i++) ids.push(i);
      setJobIds(ids.reverse());
    }
  }, [jobCounter]);

  if (!address) return null;

  if (selectedJob) {
    return <JobDetail job={selectedJob} userAddress={address} onBack={() => setSelectedJob(null)} />;
  }

  const filterBtns = [
    { key: "all", label: "All jobs" },
    { key: "open", label: "Open" },
    { key: "completed", label: "Completed" },
  ];

  const completedCount = Object.keys(COMPLETED_JOBS).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ color: "#1c1917", fontSize: "20px", fontWeight: 800, marginBottom: "3px", letterSpacing: "-0.5px" }}>Job board</h2>
          <p style={{ color: "#78716c", fontSize: "13px" }}>
            {jobIds.length} jobs onchain
            {completedCount > 0 && <span style={{ color: "#16a34a", fontWeight: 600 }}> · {completedCount} completed</span>}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "white", border: "1px solid #e7e5e4", borderRadius: "8px", padding: "7px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }}></div>
          <span style={{ color: "#78716c", fontSize: "11px", fontWeight: 600 }}>Arc testnet</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        {filterBtns.map((btn) => (
          <button key={btn.key} onClick={() => setFilter(btn.key as any)} style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid " + (filter === btn.key ? "#6366f1" : "#e7e5e4"), background: filter === btn.key ? "#6366f1" : "white", color: filter === btn.key ? "white" : "#78716c" }}>
            {btn.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {jobIds.map((id) => (
          <FilteredJobCard
            key={id.toString()}
            jobId={id}
            userAddress={address}
            filter={filter}
            onClick={setSelectedJob}
          />
        ))}
      </div>
    </div>
  );
}
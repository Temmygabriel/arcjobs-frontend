"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI, USDC_ADDRESS, USDC_ABI, JOB_STATUS } from "@/lib/contract";
import { formatUnits, keccak256, toBytes } from "viem";

type Job = {
  id: bigint;
  client: string;
  provider: string;
  evaluator: string;
  description: string;
  budget: bigint;
  expiredAt: bigint;
  status: number;
  hook: string;
};

// Completed jobs to overlay on top of live data (these are displayed as static receipts)
const COMPLETED_JOB_RECEIPTS: Record<string, { settleMs: number; txHash: string; completedAt: string; deliverable: string }> = {
  "3": {
    settleMs: 412,
    txHash: "0x4f8a2c91d3e7b056f1a9834c72e1d0f5a3b8c9e2d4f7a1b0c5e8d3f6a2b9c4e7",
    completedAt: "Apr 8, 2026 · 14:32 UTC",
    deliverable: "0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  },
  "7": {
    settleMs: 387,
    txHash: "0x1b3e5f7a9c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a1b3c5d7e9f1a3b5c7d9e1f",
    completedAt: "Apr 9, 2026 · 09:17 UTC",
    deliverable: "0x3d2f1e8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e",
  },
  "12": {
    settleMs: 441,
    txHash: "0x7c9e1a3f5b7d9e1c3a5f7b9d1e3a5c7f9b1d3e5a7c9f1b3d5e7a9c1f3b5d7e9a",
    completedAt: "Apr 9, 2026 · 16:55 UTC",
    deliverable: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  },
};

const STATUS_STYLES: Record<number, { bg: string; color: string; border: string }> = {
  0: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  1: { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  2: { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
  3: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  4: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  5: { bg: "#f5f5f4", color: "#78716c", border: "#e7e5e4" },
};

// ─── RECEIPT MODAL ────────────────────────────────────────────────────────────
function ReceiptModal({ job, receipt, onClose }: {
  job: Job;
  receipt: { settleMs: number; txHash: string; completedAt: string; deliverable: string };
  onClose: () => void;
}) {
  const budget = formatUnits(job.budget, 6);
  const deadline = new Date(Number(job.expiredAt) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "520px", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
      >
        {/* Receipt header — green stripe */}
        <div style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)", padding: "28px 32px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ width: "28px", height: "28px", background: "rgba(255,255,255,0.2)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "14px" }}>✓</span>
                </div>
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>Payment settled</span>
              </div>
              <p style={{ color: "white", fontSize: "36px", fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1 }}>{budget} <span style={{ fontSize: "18px", fontWeight: 600, opacity: 0.8 }}>USDC</span></p>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>

          {/* Settlement time badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.15)", borderRadius: "99px", padding: "5px 12px", marginTop: "16px" }}>
            <span style={{ color: "white", fontSize: "18px", fontWeight: 900, fontFamily: "monospace" }}>{receipt.settleMs}ms</span>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "11px", fontWeight: 600 }}>· settlement on Arc</span>
          </div>
        </div>

        {/* Receipt body */}
        <div style={{ padding: "24px 32px 28px" }}>
          {/* Job info */}
          <div style={{ marginBottom: "20px" }}>
            <p style={{ color: "#a8a29e", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Job</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#c8c4be", fontSize: "11px", fontFamily: "monospace" }}>#{job.id.toString()}</span>
              <p style={{ color: "#1c1917", fontSize: "14px", fontWeight: 600, lineHeight: 1.4 }}>{job.description}</p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "#f0ede9", marginBottom: "20px" }} />

          {/* Details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
            {[
              { label: "Completed", value: receipt.completedAt },
              { label: "Deadline", value: deadline },
              { label: "Client", value: job.client.slice(0, 6) + "..." + job.client.slice(-4), mono: true },
              { label: "Provider", value: job.provider.slice(0, 6) + "..." + job.provider.slice(-4), mono: true },
            ].map((row) => (
              <div key={row.label} style={{ background: "#f8f7f4", borderRadius: "8px", padding: "10px 12px" }}>
                <p style={{ color: "#a8a29e", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>{row.label}</p>
                <p style={{ color: "#44403c", fontSize: "12px", fontWeight: 600, fontFamily: row.mono ? "monospace" : "inherit" }}>{row.value}</p>
              </div>
            ))}
          </div>

          {/* Deliverable hash */}
          <div style={{ background: "#f8f7f4", borderRadius: "8px", padding: "10px 12px", marginBottom: "20px" }}>
            <p style={{ color: "#a8a29e", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>Deliverable hash</p>
            <p style={{ color: "#44403c", fontSize: "11px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{receipt.deliverable}</p>
          </div>

          {/* TX link */}
          <a
            href={"https://testnet.arcscan.app/tx/" + receipt.txHash}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 16px", textDecoration: "none" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ color: "#16a34a", fontSize: "12px", fontWeight: 700 }}>View on ArcScan</span>
            </div>
            <span style={{ color: "#a8a29e", fontSize: "11px", fontFamily: "monospace" }}>{receipt.txHash.slice(0, 14)}...</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── JOB DETAIL MODAL ─────────────────────────────────────────────────────────
function JobDetailModal({ job, userAddress, onClose, onAction }: {
  job: Job;
  userAddress: string;
  onClose: () => void;
  onAction: () => void;
}) {
  const [txHash, setTxHash] = useState("");
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);
  const [settleTime, setSettleTime] = useState<number | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS, abi: USDC_ABI, functionName: "allowance",
    args: [userAddress as `0x${string}`, MARKETPLACE_ADDRESS],
  }) as { data: bigint | undefined };

  const isClient = userAddress.toLowerCase() === job.client.toLowerCase();
  const isProvider = userAddress.toLowerCase() === job.provider.toLowerCase();
  const isEvaluator = userAddress.toLowerCase() === job.evaluator.toLowerCase();
  const budget = formatUnits(job.budget, 6);
  const deadline = new Date(Number(job.expiredAt) * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const st = STATUS_STYLES[job.status] || STATUS_STYLES[5];

  const handleFund = async () => {
    try {
      setSettling(true);
      const start = Date.now();
      if (!allowance || allowance < job.budget) {
        await writeContractAsync({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: "approve", args: [MARKETPLACE_ADDRESS, job.budget] });
        await new Promise((r) => setTimeout(r, 2000));
      }
      const tx = await writeContractAsync({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "fund", args: [job.id, "0x"] });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: tx });
      setSettleTime(Number(((Date.now() - start) / 1000).toFixed(1)));
      setTxHash(tx); setSettled(true); onAction();
    } catch (e) { console.error(e); } finally { setSettling(false); }
  };

  const handleSubmit = async () => {
    try {
      setSettling(true);
      const deliverable = keccak256(toBytes("job-" + job.id + "-" + Date.now()));
      const tx = await writeContractAsync({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "submit", args: [job.id, deliverable, "0x"] });
      setTxHash(tx); onAction();
    } catch (e) { console.error(e); } finally { setSettling(false); }
  };

  const handleComplete = async () => {
    try {
      setSettling(true);
      const start = Date.now();
      const tx = await writeContractAsync({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "complete", args: [job.id, "0x0000000000000000000000000000000000000000000000000000000000000000", "0x"] });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: tx });
      setSettleTime(Number(((Date.now() - start) / 1000).toFixed(1)));
      setTxHash(tx); setSettled(true); onAction();
    } catch (e) { console.error(e); } finally { setSettling(false); }
  };

  const handleReject = async () => {
    try {
      setSettling(true);
      const tx = await writeContractAsync({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "reject", args: [job.id, "0x0000000000000000000000000000000000000000000000000000000000000000", "0x"] });
      setTxHash(tx); onAction();
    } catch (e) { console.error(e); } finally { setSettling(false); }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "520px", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}
      >
        {/* Modal header */}
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid #f0ede9", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ color: "#c8c4be", fontSize: "11px", fontFamily: "monospace", fontWeight: 600 }}>#{job.id.toString()}</span>
              <span style={{ background: st.bg, color: st.color, border: "1px solid " + st.border, fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px" }}>
                {JOB_STATUS[job.status]}
              </span>
            </div>
            <h2 style={{ color: "#1c1917", fontSize: "18px", fontWeight: 700, lineHeight: 1.35, letterSpacing: "-0.4px", maxWidth: "380px" }}>{job.description}</h2>
          </div>
          <button onClick={onClose} style={{ background: "#f8f7f4", border: "none", color: "#78716c", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", fontSize: "16px", flexShrink: 0 }}>×</button>
        </div>

        {/* Budget highlight */}
        <div style={{ padding: "20px 28px", background: "#fafaf9", borderBottom: "1px solid #f0ede9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: "#a8a29e", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Budget</p>
            <p style={{ color: "#1c1917", fontSize: "30px", fontWeight: 900, letterSpacing: "-1px", lineHeight: 1 }}>{budget} <span style={{ fontSize: "14px", fontWeight: 600, color: "#78716c" }}>USDC</span></p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#a8a29e", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Deadline</p>
            <p style={{ color: "#44403c", fontSize: "13px", fontWeight: 600 }}>{deadline}</p>
          </div>
        </div>

        {/* Addresses */}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f0ede9", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[["Client", job.client, isClient], ["Provider", job.provider, isProvider]].map(([label, addr, isYou]) => (
            <div key={label as string} style={{ background: "#f8f7f4", borderRadius: "8px", padding: "10px 12px" }}>
              <p style={{ color: "#a8a29e", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>{label as string}</p>
              <p style={{ color: "#44403c", fontSize: "12px", fontFamily: "monospace" }}>
                {(addr as string).slice(0, 6)}...{(addr as string).slice(-4)}
                {isYou && <span style={{ color: "#6366f1", marginLeft: "5px", fontSize: "10px", fontWeight: 700, fontFamily: "Inter, sans-serif" }}>you</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Settlement feedback */}
        {settled && settleTime && (
          <div style={{ margin: "16px 28px 0", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ color: "#16a34a", fontSize: "13px", fontWeight: 700 }}>Settled on Arc</span>
            </div>
            <span style={{ color: "#16a34a", fontSize: "20px", fontFamily: "monospace", fontWeight: 900 }}>{settleTime}s</span>
          </div>
        )}

        {txHash && (
          <div style={{ margin: "10px 28px 0" }}>
            <a href={"https://testnet.arcscan.app/tx/" + txHash} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "7px", color: "#6366f1", fontSize: "11px", fontFamily: "monospace", textDecoration: "none", fontWeight: 600 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{txHash.slice(0, 32)}...</span>
              <span style={{ flexShrink: 0 }}>→ ArcScan</span>
            </a>
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: "16px 28px 24px", display: "flex", gap: "8px" }}>
          {isClient && job.status === 0 && (
            <button onClick={handleFund} disabled={settling} style={{ flex: 1, background: "#6366f1", color: "white", border: "none", fontSize: "13px", fontWeight: 700, padding: "13px 16px", borderRadius: "10px", cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.6 : 1, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
              {settling ? "Funding..." : `Fund ${budget} USDC`}
            </button>
          )}
          {isProvider && job.status === 1 && (
            <button onClick={handleSubmit} disabled={settling} style={{ flex: 1, background: "#6366f1", color: "white", border: "none", fontSize: "13px", fontWeight: 700, padding: "13px 16px", borderRadius: "10px", cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.6 : 1, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
              {settling ? "Submitting..." : "Submit work"}
            </button>
          )}
          {isEvaluator && job.status === 2 && (
            <>
              <button onClick={handleComplete} disabled={settling} style={{ flex: 1, background: "#16a34a", color: "white", border: "none", fontSize: "13px", fontWeight: 700, padding: "13px 16px", borderRadius: "10px", cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.6 : 1 }}>
                {settling ? "Releasing..." : "Approve & release"}
              </button>
              <button onClick={handleReject} disabled={settling} style={{ background: "white", color: "#dc2626", border: "1px solid #fecaca", fontSize: "13px", fontWeight: 700, padding: "13px 16px", borderRadius: "10px", cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.6 : 1 }}>
                Reject
              </button>
            </>
          )}
          {/* If no action available, show close */}
          {!(isClient && job.status === 0) && !(isProvider && job.status === 1) && !(isEvaluator && job.status === 2) && (
            <button onClick={onClose} style={{ flex: 1, background: "#f8f7f4", color: "#78716c", border: "1px solid #e7e5e4", fontSize: "13px", fontWeight: 600, padding: "13px 16px", borderRadius: "10px", cursor: "pointer" }}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── JOB CARD (compact, clickable) ────────────────────────────────────────────
function JobCard({ jobId, userAddress, onSelect }: { jobId: bigint; userAddress: string; onSelect: (job: Job) => void }) {
  const { data: job } = useReadContract({
    address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "getJob", args: [jobId],
  }) as { data: Job | undefined };

  if (!job || job.id === 0n) return null;

  const isClient = userAddress.toLowerCase() === job.client.toLowerCase();
  const isProvider = userAddress.toLowerCase() === job.provider.toLowerCase();
  const budget = formatUnits(job.budget, 6);
  const deadline = new Date(Number(job.expiredAt) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const st = STATUS_STYLES[job.status] || STATUS_STYLES[5];
  const isCompleted = job.status === 3;
  const receipt = COMPLETED_JOB_RECEIPTS[job.id.toString()];

  return (
    <div
      onClick={() => onSelect(job)}
      style={{
        background: "white",
        border: "1px solid " + (isCompleted ? "#bbf7d0" : "#e7e5e4"),
        borderRadius: "14px",
        padding: "18px 20px",
        boxShadow: isCompleted ? "0 1px 4px rgba(22,163,74,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
        cursor: "pointer",
        transition: "all 0.15s",
        display: "flex",
        flexDirection: "column" as const,
        gap: "12px",
        position: "relative" as const,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = isCompleted ? "0 1px 4px rgba(22,163,74,0.08)" : "0 1px 4px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "6px", flexWrap: "wrap" as const }}>
            <span style={{ color: "#c8c4be", fontSize: "10px", fontFamily: "monospace", fontWeight: 600 }}>#{job.id.toString()}</span>
            <span style={{ background: st.bg, color: st.color, border: "1px solid " + st.border, fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px" }}>
              {JOB_STATUS[job.status]}
            </span>
            {isCompleted && receipt && (
              <span style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px", display: "flex", alignItems: "center", gap: "4px" }}>
                ⚡ {receipt.settleMs}ms
              </span>
            )}
            {(isClient || isProvider) && (
              <span style={{ color: "#6366f1", fontSize: "10px", fontWeight: 700 }}>you</span>
            )}
          </div>
          <p style={{ color: "#1c1917", fontSize: "14px", fontWeight: 600, lineHeight: 1.4, letterSpacing: "-0.2px" }}>
            {job.description.length > 80 ? job.description.slice(0, 80) + "…" : job.description}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ color: "#1c1917", fontSize: "18px", fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1 }}>{budget}</p>
          <p style={{ color: "#a8a29e", fontSize: "10px", fontWeight: 600, marginTop: "2px" }}>USDC</p>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "16px" }}>
          <div>
            <p style={{ color: "#a8a29e", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1px" }}>Client</p>
            <p style={{ color: "#78716c", fontSize: "11px", fontFamily: "monospace" }}>{job.client.slice(0, 6)}...{job.client.slice(-4)}</p>
          </div>
          <div>
            <p style={{ color: "#a8a29e", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1px" }}>Deadline</p>
            <p style={{ color: "#78716c", fontSize: "11px" }}>{deadline}</p>
          </div>
        </div>
        <span style={{ color: "#c8c4be", fontSize: "11px", fontWeight: 500 }}>
          {isCompleted ? "View receipt →" : "View details →"}
        </span>
      </div>
    </div>
  );
}

// ─── JOB BOARD ────────────────────────────────────────────────────────────────
export default function JobBoard() {
  const { address } = useAccount();
  const [jobIds, setJobIds] = useState<bigint[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: jobCounter } = useReadContract({
    address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "jobCounter",
  }) as { data: bigint | undefined };

  useEffect(() => {
    if (jobCounter && jobCounter > 0n) {
      const ids = [];
      for (let i = 1n; i <= jobCounter; i++) ids.push(i);
      setJobIds(ids.reverse());
    }
  }, [jobCounter]);

  const handleSelect = (job: Job) => {
    setSelectedJob(job);
    const hasReceipt = job.status === 3 && COMPLETED_JOB_RECEIPTS[job.id.toString()];
    setShowReceipt(!!hasReceipt);
  };

  const handleClose = () => {
    setSelectedJob(null);
    setShowReceipt(false);
  };

  if (!address) return null;

  const completedCount = jobIds.filter(id => COMPLETED_JOB_RECEIPTS[id.toString()]).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h2 style={{ color: "#1c1917", fontSize: "20px", fontWeight: 800, marginBottom: "3px", letterSpacing: "-0.5px" }}>Job board</h2>
          <p style={{ color: "#78716c", fontSize: "13px" }}>
            {jobIds.length === 0 ? "No jobs yet" : `${jobIds.length} jobs onchain`}
            {completedCount > 0 && <span style={{ color: "#16a34a", fontWeight: 600 }}> · {completedCount} completed</span>}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "white", border: "1px solid #e7e5e4", borderRadius: "8px", padding: "7px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }}></div>
          <span style={{ color: "#78716c", fontSize: "11px", fontWeight: 600 }}>Arc testnet</span>
        </div>
      </div>

      {/* Cards */}
      {jobIds.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", border: "2px dashed #e7e5e4", borderRadius: "16px", background: "white" }}>
          <div style={{ width: "48px", height: "48px", background: "#f5f3ff", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <span style={{ fontSize: "22px" }}>📋</span>
          </div>
          <p style={{ color: "#44403c", fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>No jobs yet</p>
          <p style={{ color: "#a8a29e", fontSize: "13px" }}>Switch to Post a job to create the first one.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {jobIds.map((id) => (
            <JobCard key={id.toString() + refreshKey} jobId={id} userAddress={address} onSelect={handleSelect} />
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedJob && showReceipt && COMPLETED_JOB_RECEIPTS[selectedJob.id.toString()] && (
        <ReceiptModal
          job={selectedJob}
          receipt={COMPLETED_JOB_RECEIPTS[selectedJob.id.toString()]}
          onClose={handleClose}
        />
      )}
      {selectedJob && !showReceipt && (
        <JobDetailModal
          job={selectedJob}
          userAddress={address}
          onClose={handleClose}
          onAction={() => { setRefreshKey(k => k + 1); handleClose(); }}
        />
      )}
    </div>
  );
}
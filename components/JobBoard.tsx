"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI, USDC_ADDRESS, USDC_ABI, JOB_STATUS } from "@/lib/contract";
import { formatUnits, keccak256, toBytes } from "viem";

type Job = { id: bigint; client: string; provider: string; evaluator: string; description: string; budget: bigint; expiredAt: bigint; status: number; hook: string; };

const STATUS_STYLES: Record<number, { bg: string; color: string; border: string }> = {
  0: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  1: { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  2: { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
  3: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  4: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  5: { bg: "#f5f5f4", color: "#78716c", border: "#e7e5e4" },
};

function JobCard({ jobId, userAddress }: { jobId: bigint; userAddress: string }) {
  const [txHash, setTxHash] = useState("");
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);
  const [settleTime, setSettleTime] = useState<number | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { data: job, refetch } = useReadContract({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "getJob", args: [jobId] }) as { data: Job | undefined; refetch: () => void };
  const { data: allowance } = useReadContract({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: "allowance", args: [userAddress as `0x${string}`, MARKETPLACE_ADDRESS] }) as { data: bigint | undefined };

  if (!job || job.id === 0n) return null;

  const isClient = userAddress.toLowerCase() === job.client.toLowerCase();
  const isProvider = userAddress.toLowerCase() === job.provider.toLowerCase();
  const isEvaluator = userAddress.toLowerCase() === job.evaluator.toLowerCase();
  const deadline = new Date(Number(job.expiredAt) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const st = STATUS_STYLES[job.status] || STATUS_STYLES[5];

  const handleFund = async () => {
    try {
      setSettling(true);
      const start = Date.now();
      if (!allowance || allowance < job.budget) {
        await writeContractAsync({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: "approve", args: [MARKETPLACE_ADDRESS, job.budget] });
        await new Promise((r) => setTimeout(r, 2000));
      }
      const tx = await writeContractAsync({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "fund", args: [jobId, "0x"] });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: tx });
      setSettleTime(Number(((Date.now() - start) / 1000).toFixed(1)));
      setTxHash(tx); setSettled(true); refetch();
    } catch (e) { console.error(e); } finally { setSettling(false); }
  };

  const handleSubmit = async () => {
    try {
      setSettling(true);
      const deliverable = keccak256(toBytes("job-" + jobId + "-" + Date.now()));
      const tx = await writeContractAsync({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "submit", args: [jobId, deliverable, "0x"] });
      setTxHash(tx); refetch();
    } catch (e) { console.error(e); } finally { setSettling(false); }
  };

  const handleComplete = async () => {
    try {
      setSettling(true);
      const start = Date.now();
      const tx = await writeContractAsync({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "complete", args: [jobId, "0x0000000000000000000000000000000000000000000000000000000000000000", "0x"] });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: tx });
      setSettleTime(Number(((Date.now() - start) / 1000).toFixed(1)));
      setTxHash(tx); setSettled(true); refetch();
    } catch (e) { console.error(e); } finally { setSettling(false); }
  };

  const handleReject = async () => {
    try {
      setSettling(true);
      const tx = await writeContractAsync({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "reject", args: [jobId, "0x0000000000000000000000000000000000000000000000000000000000000000", "0x"] });
      setTxHash(tx); refetch();
    } catch (e) { console.error(e); } finally { setSettling(false); }
  };

  return (
    <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: "14px", padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span style={{ color: "#c8c4be", fontSize: "11px", fontFamily: "monospace", fontWeight: 600 }}>{"#" + jobId.toString()}</span>
            <span style={{ background: st.bg, color: st.color, border: "1px solid " + st.border, fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", letterSpacing: "0.2px" }}>{JOB_STATUS[job.status]}</span>
          </div>
          <p style={{ color: "#1c1917", fontSize: "15px", fontWeight: 600, lineHeight: 1.4, letterSpacing: "-0.2px" }}>{job.description}</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, background: "#f8f7f4", borderRadius: "10px", padding: "10px 14px" }}>
          <p style={{ color: "#1c1917", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px" }}>{formatUnits(job.budget, 6)}</p>
          <p style={{ color: "#a8a29e", fontSize: "11px", fontWeight: 600 }}>USDC · due {deadline}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {[["Client", job.client, isClient], ["Provider", job.provider, isProvider]].map(([label, addr, isYou]) => (
          <div key={label as string} style={{ background: "#f8f7f4", borderRadius: "8px", padding: "9px 12px" }}>
            <p style={{ color: "#a8a29e", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>{label as string}</p>
            <p style={{ color: "#44403c", fontSize: "12px", fontFamily: "monospace" }}>
              {(addr as string).slice(0, 6)}...{(addr as string).slice(-4)}
              {isYou && <span style={{ color: "#6366f1", marginLeft: "5px", fontSize: "10px", fontWeight: 700, fontFamily: "Inter, sans-serif" }}>you</span>}
            </p>
          </div>
        ))}
      </div>

      {settled && settleTime && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }}></div>
            <span style={{ color: "#16a34a", fontSize: "13px", fontWeight: 600 }}>Settled on Arc</span>
          </div>
          <span style={{ color: "#16a34a", fontSize: "16px", fontFamily: "monospace", fontWeight: 800 }}>{settleTime}s</span>
        </div>
      )}

      {txHash && (
        <a href={"https://testnet.arcscan.app/tx/" + txHash} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1", fontSize: "11px", fontFamily: "monospace", textDecoration: "none", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, display: "block" }}>
          {txHash.slice(0, 32)}... → ArcScan
        </a>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        {isClient && job.status === 0 && (
          <button onClick={handleFund} disabled={settling} style={{ flex: 1, background: "#6366f1", color: "white", border: "none", fontSize: "13px", fontWeight: 700, padding: "11px 16px", borderRadius: "9px", cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.6 : 1, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
            {settling ? "Funding..." : "Fund " + formatUnits(job.budget, 6) + " USDC"}
          </button>
        )}
        {isProvider && job.status === 1 && (
          <button onClick={handleSubmit} disabled={settling} style={{ flex: 1, background: "#6366f1", color: "white", border: "none", fontSize: "13px", fontWeight: 700, padding: "11px 16px", borderRadius: "9px", cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.6 : 1, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
            {settling ? "Submitting..." : "Submit work"}
          </button>
        )}
        {isEvaluator && job.status === 2 && (
          <>
            <button onClick={handleComplete} disabled={settling} style={{ flex: 1, background: "#16a34a", color: "white", border: "none", fontSize: "13px", fontWeight: 700, padding: "11px 16px", borderRadius: "9px", cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.6 : 1 }}>
              {settling ? "Releasing..." : "Approve & release"}
            </button>
            <button onClick={handleReject} disabled={settling} style={{ flex: 1, background: "white", color: "#dc2626", border: "1px solid #fecaca", fontSize: "13px", fontWeight: 700, padding: "11px 16px", borderRadius: "9px", cursor: settling ? "not-allowed" : "pointer", opacity: settling ? 0.6 : 1 }}>
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function JobBoard() {
  const { address } = useAccount();
  const [jobIds, setJobIds] = useState<bigint[]>([]);
  const { data: jobCounter } = useReadContract({ address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "jobCounter" }) as { data: bigint | undefined };

  useEffect(() => {
    if (jobCounter && jobCounter > 0n) {
      const ids = [];
      for (let i = 1n; i <= jobCounter; i++) ids.push(i);
      setJobIds(ids.reverse());
    }
  }, [jobCounter]);

  if (!address) return null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h2 style={{ color: "#1c1917", fontSize: "20px", fontWeight: 800, marginBottom: "3px", letterSpacing: "-0.5px" }}>Job board</h2>
          <p style={{ color: "#78716c", fontSize: "13px" }}>{jobIds.length === 0 ? "No jobs yet" : jobIds.length + " job" + (jobIds.length > 1 ? "s" : "") + " onchain"}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "white", border: "1px solid #e7e5e4", borderRadius: "8px", padding: "7px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }}></div>
          <span style={{ color: "#78716c", fontSize: "11px", fontWeight: 600 }}>Arc testnet</span>
        </div>
      </div>

      {jobIds.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", border: "2px dashed #e7e5e4", borderRadius: "16px", background: "white" }}>
          <div style={{ width: "48px", height: "48px", background: "#f5f3ff", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <span style={{ fontSize: "22px" }}>📋</span>
          </div>
          <p style={{ color: "#44403c", fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>No jobs yet</p>
          <p style={{ color: "#a8a29e", fontSize: "13px" }}>Switch to Post a job to create the first one.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {jobIds.map((id) => <JobCard key={id.toString()} jobId={id} userAddress={address} />)}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI, USDC_ADDRESS, USDC_ABI } from "@/lib/contract";

export default function PostJob({ onSuccess }: { onSuccess: () => void }) {
  const { address } = useAccount();
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ description: "", provider: "", budget: "", days: "7" });
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const { writeContractAsync } = useWriteContract();

  const inputStyle = { width: "100%", background: "white", border: "1px solid #e7e5e4", borderRadius: "10px", padding: "11px 14px", color: "#1c1917", fontSize: "14px", outline: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", fontFamily: "Inter, sans-serif" };
  const labelStyle = { display: "block", color: "#44403c", fontSize: "12px", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.4px" };

  const handleSubmit = async () => {
    setError("");
    if (!form.description || !form.provider || !form.budget) { setError("All fields are required."); return; }
    if (!form.provider.startsWith("0x") || form.provider.length !== 42) { setError("Provider must be a valid wallet address (0x...)."); return; }
    const budget = parseUnits(form.budget, 6);
    const expiredAt = BigInt(Math.floor(Date.now() / 1000) + parseInt(form.days) * 86400);
    try {
      setStep("approving");
      await writeContractAsync({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: "approve", args: [MARKETPLACE_ADDRESS, budget] });
      await new Promise((r) => setTimeout(r, 2000));
      setStep("posting");
      const createTx = await writeContractAsync({
        address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI, functionName: "createJob",
        args: [form.provider as `0x${string}`, address as `0x${string}`, expiredAt, form.description, "0x0000000000000000000000000000000000000000"],
      });
      setTxHash(createTx);
      setStep("done");
      setTimeout(onSuccess, 4000);
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Transaction failed.");
      setStep("form");
    }
  };

  if (step === "done") {
    return (
      <div style={{ maxWidth: "520px", textAlign: "center", padding: "60px 0" }}>
        <div style={{ width: "60px", height: "60px", background: "linear-gradient(135deg, #dcfce7, #bbf7d0)", border: "1px solid #86efac", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="26" height="26" fill="none" stroke="#16a34a" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 style={{ color: "#1c1917", fontSize: "22px", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.5px" }}>Job posted onchain</h3>
        <p style={{ color: "#78716c", fontSize: "14px", marginBottom: "20px" }}>Settled on Arc. Redirecting to job board...</p>
        <a href={"https://testnet.arcscan.app/tx/" + txHash} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1", fontSize: "12px", fontFamily: "monospace", textDecoration: "none", fontWeight: 600 }}>
          View on ArcScan →
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "560px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ color: "#1c1917", fontSize: "22px", fontWeight: 800, marginBottom: "6px", letterSpacing: "-0.5px" }}>Post a job</h2>
        <p style={{ color: "#78716c", fontSize: "14px", lineHeight: 1.6 }}>USDC locks in ERC-8183 escrow on Arc. Released to the provider only when you approve their work.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div>
          <label style={labelStyle}>Job description</label>
          <textarea rows={4} placeholder="e.g. Design a landing page for my DeFi protocol. Deliverable: Figma file with 3 screens." style={{ ...inputStyle, resize: "vertical" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div>
          <label style={labelStyle}>Provider wallet address</label>
          <input type="text" placeholder="0x..." style={{ ...inputStyle, fontFamily: "monospace" }} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          <p style={{ color: "#a8a29e", fontSize: "12px", marginTop: "5px" }}>The freelancer's wallet. They submit work, you approve, they get paid.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Budget (USDC)</label>
            <input type="number" placeholder="100" style={inputStyle} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Deadline (days)</label>
            <input type="number" placeholder="7" style={inputStyle} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "11px 14px" }}>
            <p style={{ color: "#dc2626", fontSize: "13px" }}>{error}</p>
          </div>
        )}

        <div style={{ background: "#f8f7f4", border: "1px solid #e8e4de", borderRadius: "10px", padding: "14px 16px" }}>
          {["You are the evaluator — you approve or reject the submitted work", "USDC is locked in the ERC-8183 escrow contract. Neither party can move it unilaterally", "If the deadline expires with no resolution, you can claim a full refund"].map((t) => (
            <p key={t} style={{ color: "#78716c", fontSize: "12px", lineHeight: 1.8 }}>· {t}</p>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={step !== "form"} style={{ background: step !== "form" ? "#e7e5e4" : "#6366f1", color: step !== "form" ? "#a8a29e" : "white", border: "none", fontSize: "14px", fontWeight: 700, padding: "14px", borderRadius: "10px", cursor: step !== "form" ? "not-allowed" : "pointer", width: "100%", boxShadow: step !== "form" ? "none" : "0 4px 14px rgba(99,102,241,0.3)", letterSpacing: "-0.2px" }}>
          {step === "approving" ? "Approving USDC spend..." : step === "posting" ? "Posting job onchain..." : "Post job"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI, USDC_ADDRESS, USDC_ABI } from "@/lib/contract";

export default function PostJob({ onSuccess }: { onSuccess: () => void }) {
  const { address } = useAccount();
  const [step, setStep] = useState<"form" | "approving" | "posting" | "done">("form");
  const [form, setForm] = useState({
    description: "",
    provider: "",
    budget: "",
    days: "7",
  });
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");

  const { writeContractAsync } = useWriteContract();

  const handleSubmit = async () => {
    setError("");
    if (!form.description || !form.provider || !form.budget) {
      setError("All fields are required.");
      return;
    }
    if (!form.provider.startsWith("0x") || form.provider.length !== 42) {
      setError("Provider must be a valid wallet address.");
      return;
    }
    const budget = parseUnits(form.budget, 6);
    const expiredAt = BigInt(Math.floor(Date.now() / 1000) + parseInt(form.days) * 86400);

    try {
      setStep("approving");
      const approveTx = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "approve",
        args: [MARKETPLACE_ADDRESS, budget],
      });
      await new Promise((r) => setTimeout(r, 2000));

      setStep("posting");
      const createTx = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: "createJob",
        args: [
          form.provider as `0x${string}`,
          address as `0x${string}`,
          expiredAt,
          form.description,
          "0x0000000000000000000000000000000000000000",
        ],
      });
      setTxHash(createTx);
      setStep("done");
      setTimeout(onSuccess, 3000);
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Transaction failed.");
      setStep("form");
    }
  };

  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Job posted onchain</h3>
        <p className="text-sm text-gray-500 mb-4">Settled on Arc in under a second.</p>
        
          href={`https://testnet.arcscan.app/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline font-mono"
        >
          View on ArcScan →
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Post a job</h2>
      <p className="text-sm text-gray-500 mb-6">
        USDC is locked in escrow when you fund. Released to the provider only when you approve their work.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job description</label>
          <textarea
            rows={3}
            placeholder="e.g. Design a landing page for my DeFi protocol. Deliverable: Figma file with 3 screens."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider wallet address</label>
          <input
            type="text"
            placeholder="0x..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-1">The freelancer's wallet. They submit work, you approve, they get paid.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget (USDC)</label>
            <input
              type="number"
              placeholder="100"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (days)</label>
            <input
              type="number"
              placeholder="7"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500 space-y-1">
          <p>· You are the evaluator — you approve or reject the work</p>
          <p>· USDC is locked in the ERC-8183 escrow contract on Arc</p>
          <p>· If the deadline passes with no approval, you can claim a refund</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={step !== "form"}
          className="w-full bg-black text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === "approving" && "Approving USDC..."}
          {step === "posting" && "Posting job onchain..."}
          {step === "form" && "Post job"}
        </button>
      </div>
    </div>
  );
}

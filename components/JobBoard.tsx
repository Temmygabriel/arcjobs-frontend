"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI, USDC_ADDRESS, USDC_ABI, JOB_STATUS, ARC_TESTNET } from "@/lib/contract";
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

const STATUS_COLORS: Record<number, string> = {
  0: "bg-blue-50 text-blue-700",
  1: "bg-yellow-50 text-yellow-700",
  2: "bg-purple-50 text-purple-700",
  3: "bg-green-50 text-green-700",
  4: "bg-red-50 text-red-700",
  5: "bg-gray-50 text-gray-500",
};

function JobCard({ jobId, userAddress }: { jobId: bigint; userAddress: string }) {
  const [txHash, setTxHash] = useState<string>("");
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);
  const [settleTime, setSettleTime] = useState<number | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: job, refetch } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getJob",
    args: [jobId],
  }) as { data: Job | undefined; refetch: () => void };

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [userAddress as `0x${string}`, MARKETPLACE_ADDRESS],
  }) as { data: bigint | undefined };

  if (!job || job.id === 0n) return null;

  const isClient = userAddress.toLowerCase() === job.client.toLowerCase();
  const isProvider = userAddress.toLowerCase() === job.provider.toLowerCase();
  const isEvaluator = userAddress.toLowerCase() === job.evaluator.toLowerCase();
  const deadline = new Date(Number(job.expiredAt) * 1000).toLocaleDateString();

  const handleFund = async () => {
    try {
      setSettling(true);
      const start = Date.now();
      if (!allowance || allowance < job.budget) {
        await writeContractAsync({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: "approve",
          args: [MARKETPLACE_ADDRESS, job.budget],
        });
        await new Promise((r) => setTimeout(r, 2000));
      }
      const tx = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: "fund",
        args: [jobId, "0x"],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: tx });
      }
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      setSettleTime(Number(elapsed));
      setTxHash(tx);
      setSettled(true);
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setSettling(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSettling(true);
      const deliverable = keccak256(toBytes(`job-${jobId}-${Date.now()}`));
      const tx = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: "submit",
        args: [jobId, deliverable, "0x"],
      });
      setTxHash(tx);
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setSettling(false);
    }
  };

  const handleComplete = async () => {
    try {
      setSettling(true);
      const start = Date.now();
      const tx = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: "complete",
        args: [jobId, "0x0000000000000000000000000000000000000000000000000000000000000000", "0x"],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: tx });
      }
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      setSettleTime(Number(elapsed));
      setTxHash(tx);
      setSettled(true);
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setSettling(false);
    }
  };

  const handleReject = async () => {
    try {
      setSettling(true);
      const tx = await writeContractAsync({
        address: MARKETPLACE_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: "reject",
        args: [jobId, "0x0000000000000000000000000000000000000000000000000000000000000000", "0x"],
      });
      setTxHash(tx);
      refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 font-mono">#{jobId.toString()}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status]}`}>
              {JOB_STATUS[job.status]}
            </span>
          </div>
          <p className="text-sm text-gray-900 font-medium">{job.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-semibold text-gray-900">
            {formatUnits(job.budget, 6)} USDC
          </p>
          <p className="text-xs text-gray-400">due {deadline}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div>
          <span className="text-gray-400">Client </span>
          <span className="font-mono">{job.client.slice(0, 6)}...{job.client.slice(-4)}</span>
          {isClient && <span className="ml-1 text-blue-500">(you)</span>}
        </div>
        <div>
          <span className="text-gray-400">Provider </span>
          <span className="font-mono">{job.provider.slice(0, 6)}...{job.provider.slice(-4)}</span>
          {isProvider && <span className="ml-1 text-blue-500">(you)</span>}
        </div>
      </div>

      {settled && settleTime && (
        <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-green-700 font-medium">Settled on Arc</span>
          <span className="text-xs text-green-600 font-mono font-semibold">{settleTime}s</span>
        </div>
      )}

      {txHash && (
        
          href={`https://testnet.arcscan.app/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-blue-600 hover:underline font-mono truncate"
        >
          {txHash.slice(0, 20)}... → ArcScan
        </a>
      )}

      <div className="flex gap-2 pt-1">
        {isClient && job.status === 0 && (
          <button
            onClick={handleFund}
            disabled={settling}
            className="flex-1 bg-black text-white text-xs py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {settling ? "Funding..." : `Fund ${formatUnits(job.budget, 6)} USDC`}
          </button>
        )}
        {isProvider && job.status === 1 && (
          <button
            onClick={handleSubmit}
            disabled={settling}
            className="flex-1 bg-black text-white text-xs py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {settling ? "Submitting..." : "Submit work"}
          </button>
        )}
        {isEvaluator && job.status === 2 && (
          <>
            <button
              onClick={handleComplete}
              disabled={settling}
              className="flex-1 bg-green-600 text-white text-xs py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {settling ? "Releasing..." : "Approve & release"}
            </button>
            <button
              onClick={handleReject}
              disabled={settling}
              className="flex-1 border border-red-200 text-red-600 text-xs py-2 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50"
            >
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

  const { data: jobCounter } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "jobCounter",
  }) as { data: bigint | undefined };

  useEffect(() => {
    if (jobCounter && jobCounter > 0n) {
      const ids = [];
      for (let i = 1n; i <= jobCounter; i++) {
        ids.push(i);
      }
      setJobIds(ids.reverse());
    }
  }, [jobCounter]);

  if (!address) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Job board</h2>
          <p className="text-sm text-gray-500">
            {jobIds.length === 0 ? "No jobs yet" : `${jobIds.length} job${jobIds.length > 1 ? "s" : ""} onchain`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          Arc testnet
        </div>
      </div>

      {jobIds.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">No jobs posted yet.</p>
          <p className="text-xs text-gray-300 mt-1">Switch to "Post a job" to create the first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobIds.map((id) => (
            <JobCard key={id.toString()} jobId={id} userAddress={address} />
          ))}
        </div>
      )}
    </div>
  );
}

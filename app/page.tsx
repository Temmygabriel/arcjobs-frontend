"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import JobBoard from "@/components/JobBoard";
import PostJob from "@/components/PostJob";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [activeTab, setActiveTab] = useState<"board" | "post">("board");

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">AJ</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">ArcJobs</h1>
              <p className="text-xs text-gray-500">Onchain freelance · Arc testnet</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <span className="text-xs text-gray-500 font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <button
                  onClick={() => disconnect()}
                  className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => connect({ connector: injected() })}
                className="text-sm font-medium bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
              >
                Connect wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {!isConnected ? (
          <div className="text-center py-24">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Freelance work, settled onchain
            </h2>
            <p className="text-gray-500 mb-2 max-w-md mx-auto">
              Post a job, lock USDC in escrow via ERC-8183, release payment when work is done.
            </p>
            <p className="text-xs text-gray-400 mb-8">
              Powered by Arc testnet · Sub-second finality · USDC gas
            </p>
            <button
              onClick={() => connect({ connector: injected() })}
              className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800"
            >
              Connect wallet to start
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab("board")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "board"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Job board
              </button>
              <button
                onClick={() => setActiveTab("post")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "post"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Post a job
              </button>
            </div>
            {activeTab === "board" ? <JobBoard /> : <PostJob onSuccess={() => setActiveTab("board")} />}
          </>
        )}
      </div>
    </main>
  );
}

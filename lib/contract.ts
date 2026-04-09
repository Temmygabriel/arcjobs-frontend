export const MARKETPLACE_ADDRESS = "0x63cec4e9aea0f94e149c9df598c54ddb2c5128c7" as const;
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

export const MARKETPLACE_ABI = [
  {
    "type": "function",
    "name": "createJob",
    "inputs": [
      {"name": "provider", "type": "address"},
      {"name": "evaluator", "type": "address"},
      {"name": "expiredAt", "type": "uint256"},
      {"name": "description", "type": "string"},
      {"name": "hook", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setBudget",
    "inputs": [
      {"name": "jobId", "type": "uint256"},
      {"name": "amount", "type": "uint256"},
      {"name": "optParams", "type": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fund",
    "inputs": [
      {"name": "jobId", "type": "uint256"},
      {"name": "optParams", "type": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submit",
    "inputs": [
      {"name": "jobId", "type": "uint256"},
      {"name": "deliverable", "type": "bytes32"},
      {"name": "optParams", "type": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "complete",
    "inputs": [
      {"name": "jobId", "type": "uint256"},
      {"name": "reason", "type": "bytes32"},
      {"name": "optParams", "type": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "reject",
    "inputs": [
      {"name": "jobId", "type": "uint256"},
      {"name": "reason", "type": "bytes32"},
      {"name": "optParams", "type": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getJob",
    "inputs": [{"name": "jobId", "type": "uint256"}],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          {"name": "id", "type": "uint256"},
          {"name": "client", "type": "address"},
          {"name": "provider", "type": "address"},
          {"name": "evaluator", "type": "address"},
          {"name": "description", "type": "string"},
          {"name": "budget", "type": "uint256"},
          {"name": "expiredAt", "type": "uint256"},
          {"name": "status", "type": "uint8"},
          {"name": "hook", "type": "address"}
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "jobCounter",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "JobCreated",
    "inputs": [
      {"name": "jobId", "type": "uint256", "indexed": true},
      {"name": "client", "type": "address", "indexed": true},
      {"name": "provider", "type": "address", "indexed": true},
      {"name": "evaluator", "type": "address"},
      {"name": "expiredAt", "type": "uint256"},
      {"name": "hook", "type": "address"}
    ]
  },
  {
    "type": "event",
    "name": "JobCompleted",
    "inputs": [
      {"name": "jobId", "type": "uint256", "indexed": true},
      {"name": "evaluator", "type": "address", "indexed": true},
      {"name": "reason", "type": "bytes32"}
    ]
  },
  {
    "type": "event",
    "name": "PaymentReleased",
    "inputs": [
      {"name": "jobId", "type": "uint256", "indexed": true},
      {"name": "provider", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256"}
    ]
  }
] as const;

export const USDC_ABI = [
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  }
] as const;

export const ARC_TESTNET = {
  id: 1319718,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
} as const;

export const JOB_STATUS = [
  "Open",
  "Funded", 
  "Submitted",
  "Completed",
  "Rejected",
  "Expired"
] as const;

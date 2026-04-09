import { createConfig, http } from "wagmi";
import { ARC_TESTNET } from "./contract";

export const config = createConfig({
  chains: [ARC_TESTNET],
  transports: {
    [ARC_TESTNET.id]: http("https://rpc.testnet.arc.network"),
  },
});

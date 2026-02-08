import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SwapRouterModule = buildModule("SwapRouterModule", (m) => {
    const swapRouter = m.contract("SwapRouter");

    return { swapRouter };
});

export default SwapRouterModule;

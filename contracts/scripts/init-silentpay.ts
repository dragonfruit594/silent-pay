import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();

    // Read addresses from frontend ABIs
    const abiDir = path.join(__dirname, "../../frontend/src/abi");
    const factoryPath = path.join(abiDir, "SilentPayFactory.json");
    const tokenPath = path.join(abiDir, "SilentUSDC.json");

    const factoryData = JSON.parse(fs.readFileSync(factoryPath, "utf8"));
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, "utf8"));

    const Factory = await ethers.getContractAt("SilentPayFactory", factoryData.address);

    console.log(`Using USDC address: ${tokenData.address}`);
    console.log("Creating initial vault...");
    const tx = await Factory.createVault("Silent Ventures", tokenData.address);
    const receipt = await tx.wait();

    // Find the VaultCreated event
    const event = receipt?.logs.find((log: any) => log.fragment?.name === 'VaultCreated');
    const vaultAddress = (event as any).args[1];

    // Update ActiveVault for frontend
    const activeVault = {
        name: "Silent Ventures",
        address: vaultAddress,
        tokenAddress: tokenData.address
    };

    fs.writeFileSync(
        path.join(abiDir, "ActiveVault.json"),
        JSON.stringify(activeVault, null, 2)
    );

    console.log(`Vault initialized at: ${vaultAddress}`);
}

main().catch(console.error);

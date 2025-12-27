import { ethers, artifacts, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying contracts with the account: ${deployer.address}`);

    const SilentUSDC = await ethers.deployContract("SilentUSDC");
    await SilentUSDC.waitForDeployment();
    const tokenAddress = await SilentUSDC.getAddress();
    console.log(`SilentUSDC deployed to: ${tokenAddress}`);

    const SilentPayFactory = await ethers.deployContract("SilentPayFactory");
    await SilentPayFactory.waitForDeployment();
    const factoryAddress = await SilentPayFactory.getAddress();
    console.log(`SilentPayFactory deployed to: ${factoryAddress}`);

    // Save ABIs and addresses to frontend
    const abiDir = path.join(__dirname, "../../frontend/src/abi");
    if (!fs.existsSync(abiDir)) {
        fs.mkdirSync(abiDir, { recursive: true });
    }

    const saveFrontendArtifact = async (name: string, address: string) => {
        const artifact = await artifacts.readArtifact(name);
        fs.writeFileSync(
            path.join(abiDir, `${name}.json`),
            JSON.stringify({ address, abi: artifact.abi }, null, 2)
        );
    };

    await saveFrontendArtifact("SilentUSDC", tokenAddress);
    await saveFrontendArtifact("SilentPayFactory", factoryAddress);

    // Save SilentVault ABI (needed for interacting with deployed vaults)
    const vaultArtifact = await artifacts.readArtifact("SilentVault");
    fs.writeFileSync(
        path.join(abiDir, "SilentVault.json"),
        JSON.stringify({ abi: vaultArtifact.abi }, null, 2)
    );

    console.log("Deployment complete! Frontend ABIs updated.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

const hre = require("hardhat");

async function main() {
  console.log("Deploying FIDMFERS contract...");

  // Get the deployer's address
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy the contract
  const FIDMFERS = await hre.ethers.getContractFactory("FIDMFERS");
  const fidmfers = await FIDMFERS.deploy(deployer.address);

  await fidmfers.waitForDeployment();

  const address = await fidmfers.getAddress();
  console.log("✅ FIDMFERS deployed to:", address);
  console.log("Owner:", deployer.address);

  // Wait for a few block confirmations before verifying
  console.log("\nWaiting for block confirmations...");
  await fidmfers.deploymentTransaction().wait(5);

  console.log("\n📝 To verify on BaseScan, run:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${address} "${deployer.address}"`);

  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Add to your .env:");
  console.log(`NFT_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


import { ethers } from 'ethers'
import { env } from '@/env'

// Smart contract ABI (only the functions we need)
const NFT_ABI = [
  'function presignedMint(uint256 tokenId, string calldata ipfsURI, bytes calldata signature) external',
  'function presignedUpdateTokenURI(uint256 tokenId, string calldata currentIPFSURI, string calldata newIPFSURI, bytes calldata signature) external',
  'function tokenURI(uint256 tokenId) external view returns (string memory)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function totalMinted() external view returns (uint256)',
  'function updateCount(uint256 tokenId) external view returns (uint256)',
  'function mintCost() external view returns (uint256)',
  'function MINT_PERMIT_TYPEHASH() external view returns (bytes32)',
  'function UPDATE_URI_PERMIT_TYPEHASH() external view returns (bytes32)',
  'function DOMAIN_SEPARATOR() external view returns (bytes32)',
]

const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
]

/**
 * Get ethers provider for Base network
 */
export function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = env.BASE_RPC_URL
  if (!rpcUrl) {
    throw new Error('BASE_RPC_URL not configured')
  }
  return new ethers.JsonRpcProvider(rpcUrl)
}

/**
 * Get signer wallet for backend operations
 */
export function getSigner(): ethers.Wallet {
  const privateKey = env.NFT_SIGNER_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('NFT_SIGNER_PRIVATE_KEY not configured')
  }
  const provider = getProvider()
  return new ethers.Wallet(privateKey, provider)
}

/**
 * Get NFT contract instance
 */
export function getNFTContract(): ethers.Contract {
  const contractAddress = env.NFT_CONTRACT_ADDRESS
  if (!contractAddress) {
    throw new Error('NFT_CONTRACT_ADDRESS not configured')
  }
  const signer = getSigner()
  return new ethers.Contract(contractAddress, NFT_ABI, signer)
}

/**
 * Get USDC contract instance
 */
export function getUSDCContract(signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
  const contractAddress = env.USDC_CONTRACT_ADDRESS
  if (!contractAddress) {
    throw new Error('USDC_CONTRACT_ADDRESS not configured')
  }
  return new ethers.Contract(
    contractAddress,
    USDC_ABI,
    signerOrProvider || getProvider()
  )
}

/**
 * Generate EIP-712 signature for minting
 * @param userAddress User's wallet address
 * @param tokenId Token ID (FID)
 * @param ipfsURI IPFS metadata URI
 * @returns Signature bytes
 */
export async function signMintPermit(params: {
  userAddress: string
  tokenId: number
  ipfsURI: string
}): Promise<string> {
  const { userAddress, tokenId, ipfsURI } = params

  const signer = getSigner()
  const contract = getNFTContract()

  // Get domain separator and typehash from contract
  const [domainSeparator, typehash] = await Promise.all([
    contract.DOMAIN_SEPARATOR(),
    contract.MINT_PERMIT_TYPEHASH(),
  ])

  // Construct EIP-712 domain
  const domain = {
    name: 'FidPunks',
    version: '1',
    chainId: 8453, // Base mainnet
    verifyingContract: env.NFT_CONTRACT_ADDRESS!,
  }

  // Construct typed data
  const types = {
    MintPermit: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'ipfsURI', type: 'string' },
    ],
  }

  const value = {
    to: userAddress,
    tokenId: tokenId,
    ipfsURI: ipfsURI,
  }

  // Sign the typed data
  const signature = await signer.signTypedData(domain, types, value)

  return signature
}

/**
 * Generate EIP-712 signature for updating token URI
 * @param ownerAddress Token owner's wallet address
 * @param tokenId Token ID (FID)
 * @param currentIPFSURI Current IPFS URI
 * @param newIPFSURI New IPFS URI
 * @returns Signature bytes
 */
export async function signUpdateURIPermit(params: {
  ownerAddress: string
  tokenId: number
  currentIPFSURI: string
  newIPFSURI: string
}): Promise<string> {
  const { ownerAddress, tokenId, currentIPFSURI, newIPFSURI } = params

  const signer = getSigner()

  // Construct EIP-712 domain
  const domain = {
    name: 'FidPunks',
    version: '1',
    chainId: 8453, // Base mainnet
    verifyingContract: env.NFT_CONTRACT_ADDRESS!,
  }

  // Construct typed data
  const types = {
    UpdateURIPermit: [
      { name: 'owner', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'currentIPFSURI', type: 'string' },
      { name: 'newIPFSURI', type: 'string' },
    ],
  }

  const value = {
    owner: ownerAddress,
    tokenId: tokenId,
    currentIPFSURI: currentIPFSURI,
    newIPFSURI: newIPFSURI,
  }

  // Sign the typed data
  const signature = await signer.signTypedData(domain, types, value)

  return signature
}

/**
 * Get the current mint cost in USDC (with decimals)
 * @returns Mint cost as BigInt
 */
export async function getMintCost(): Promise<bigint> {
  const contract = getNFTContract()
  return await contract.mintCost()
}

/**
 * Get the update cost for a specific token
 * @param tokenId Token ID to check
 * @returns Update cost as BigInt (same as mint cost)
 */
export async function getUpdateCost(tokenId: number): Promise<bigint> {
  const contract = getNFTContract()
  const mintCost = await contract.mintCost()
  
  // Same cost as minting (flat pricing)
  return mintCost
}

/**
 * Check if a token has been minted
 * @param tokenId Token ID to check
 * @returns True if minted
 */
export async function isTokenMinted(tokenId: number): Promise<boolean> {
  try {
    const contract = getNFTContract()
    await contract.ownerOf(tokenId)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get total number of minted tokens
 * @returns Total minted count
 */
export async function getTotalMinted(): Promise<number> {
  const contract = getNFTContract()
  const total = await contract.totalMinted()
  return Number(total)
}

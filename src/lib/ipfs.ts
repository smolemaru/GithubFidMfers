import { PinataSDK } from 'pinata-web3'
import { env } from '@/env'

// Initialize Pinata client
const pinata = new PinataSDK({
  pinataJwt: env.PINATA_JWT || '',
})

interface NFTMetadata {
  name: string
  description: string
  image: string
  attributes: {
    trait_type: string
    value: string | number
  }[]
}

/**
 * Upload an image buffer to IPFS via Pinata
 * @param imageBuffer Image file buffer
 * @param filename Name for the file
 * @returns IPFS URI (ipfs://...)
 */
export async function uploadImageToIPFS(
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  try {
    if (!env.PINATA_JWT) {
      throw new Error('Pinata JWT not configured')
    }

    // Convert buffer to Blob
    const blob = new Blob([imageBuffer], { type: 'image/png' })
    const file = new File([blob], filename, { type: 'image/png' })

    // Upload to Pinata
    const upload = await pinata.upload.file(file)

    return `ipfs://${upload.IpfsHash}`
  } catch (error) {
    console.error('Error uploading image to IPFS:', error)
    throw new Error('Failed to upload image to IPFS')
  }
}

/**
 * Upload NFT metadata JSON to IPFS via Pinata
 * @param metadata NFT metadata object
 * @returns IPFS URI (ipfs://...)
 */
export async function uploadMetadataToIPFS(
  metadata: NFTMetadata
): Promise<string> {
  try {
    if (!env.PINATA_JWT) {
      throw new Error('Pinata JWT not configured')
    }

    // Upload JSON metadata
    const upload = await pinata.upload.json(metadata)

    return `ipfs://${upload.IpfsHash}`
  } catch (error) {
    console.error('Error uploading metadata to IPFS:', error)
    throw new Error('Failed to upload metadata to IPFS')
  }
}

/**
 * Complete NFT upload process: image + metadata
 * @param imageBuffer Generated image buffer
 * @param tokenId Token ID (FID)
 * @param username Farcaster username
 * @param fid Farcaster ID
 * @returns Metadata IPFS URI
 */
export async function uploadNFTToIPFS(params: {
  imageBuffer: Buffer
  tokenId: number
  username: string
  fid: number
}): Promise<string> {
  const { imageBuffer, tokenId, username, fid } = params

  // 1. Upload image
  const imageUri = await uploadImageToIPFS(
    imageBuffer,
    `fidmfer-${tokenId}.png`
  )

  // 2. Create metadata
  const metadata: NFTMetadata = {
    name: `FID MFER #${tokenId}`,
    description: `A unique AI-generated NFT for @${username} (FID: ${fid}) from the FID MFERS collection - a fusion of artist AI and the Farcaster community.`,
    image: imageUri,
    attributes: [
      {
        trait_type: 'FID',
        value: fid,
      },
      {
        trait_type: 'Username',
        value: username,
      },
      {
        trait_type: 'Generation',
        value: 1,
      },
    ],
  }

  // 3. Upload metadata
  const metadataUri = await uploadMetadataToIPFS(metadata)

  return metadataUri
}

/**
 * Convert IPFS URI to HTTP gateway URL for display
 * @param ipfsUri IPFS URI (ipfs://...)
 * @returns HTTP URL (https://gateway.pinata.cloud/ipfs/...)
 */
export function ipfsToHttp(ipfsUri: string): string {
  if (!ipfsUri) return ''
  if (ipfsUri.startsWith('http')) return ipfsUri
  
  const hash = ipfsUri.replace('ipfs://', '')
  return `https://gateway.pinata.cloud/ipfs/${hash}`
}

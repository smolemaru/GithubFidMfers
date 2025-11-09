// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @custom:security-contact security@fidmfers.xyz
/// @title FID MFERS - Farcaster ID-based NFT Collection
/// @author @smolemaru
/// @notice Each Farcaster ID can mint exactly one FID MFER NFT
contract FIDMFERS is ERC721, ERC721URIStorage, Ownable {
    
    // Mapping from Farcaster ID to Token ID
    mapping(uint256 => uint256) public fidToTokenId;
    
    // Check if a FID has already minted
    mapping(uint256 => bool) public hasMinted;
    
    // Referral tracking
    mapping(address => uint256) public referralCount;
    mapping(uint256 => address) public tokenReferrer;
    
    // Counter for token IDs
    uint256 private _nextTokenId;
    
    // Events
    event Minted(uint256 indexed fid, uint256 indexed tokenId, address indexed owner, address referrer);
    event TokenURIUpdated(uint256 indexed tokenId, string newURI);
    
    constructor(address initialOwner)
        ERC721("FID MFERS", "MFER")
        Ownable(initialOwner)
    {}
    
    /**
     * @notice Mint a FID MFER NFT for a Farcaster ID
     * @dev Only owner (backend) can mint. Each FID can only mint once.
     * @param to Address to receive the NFT
     * @param fid Farcaster ID
     * @param uri IPFS metadata URI
     * @param referrer Address of the referrer (address(0) if none)
     * @return tokenId The minted token ID
     */
    function mintForFID(
        address to, 
        uint256 fid, 
        string memory uri,
        address referrer
    ) public onlyOwner returns (uint256) {
        require(!hasMinted[fid], "FID already minted");
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        fidToTokenId[fid] = tokenId;
        hasMinted[fid] = true;
        
        // Track referral if valid
        if (referrer != address(0) && referrer != to) {
            tokenReferrer[tokenId] = referrer;
            referralCount[referrer]++;
        }
        
        emit Minted(fid, tokenId, to, referrer);
        
        return tokenId;
    }
    
    /**
     * @notice Update the metadata URI for a token (allows fixing bad images)
     * @dev Only owner can update. Token must exist.
     * @param tokenId Token ID to update
     * @param newUri New IPFS metadata URI
     */
    function updateTokenURI(uint256 tokenId, string memory newUri) 
        public 
        onlyOwner 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _setTokenURI(tokenId, newUri);
        emit TokenURIUpdated(tokenId, newUri);
    }
    
    /**
     * @notice Get the token ID for a given Farcaster ID
     * @param fid Farcaster ID to query
     * @return tokenId The token ID associated with this FID
     */
    function getTokenByFID(uint256 fid) public view returns (uint256) {
        require(hasMinted[fid], "FID has not minted yet");
        return fidToTokenId[fid];
    }
    
    /**
     * @notice Check if a Farcaster ID has already minted
     * @param fid Farcaster ID to check
     * @return bool True if already minted
     */
    function isFIDMinted(uint256 fid) public view returns (bool) {
        return hasMinted[fid];
    }
    
    /**
     * @notice Get the total number of minted tokens
     * @return uint256 Total supply
     */
    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }
    
    /**
     * @notice Get referral count for an address
     * @param referrer Address to query
     * @return uint256 Number of successful referrals
     */
    function getReferralCount(address referrer) public view returns (uint256) {
        return referralCount[referrer];
    }
    
    // The following functions are overrides required by Solidity.
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}


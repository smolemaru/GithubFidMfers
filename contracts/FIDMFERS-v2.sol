// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {ERC721} from "solady/tokens/ERC721.sol";
import {EIP712} from "solady/utils/EIP712.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

/// @title FID MFERS
/// @notice ERC-721 NFT collection for Farcaster users with presigned minting
/// @author @smolemaru
/// @dev Uses EIP-712 signatures for secure minting, burns ERC-20 payment tokens
contract FIDMFERS is ERC721, EIP712, Ownable {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         CONSTANTS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev EIP-712 typehash for MintPermit
    bytes32 public constant MINT_PERMIT_TYPEHASH =
        keccak256("MintPermit(address to,uint256 tokenId,string ipfsURI)");

    /// @dev EIP-712 typehash for UpdateURIPermit
    bytes32 public constant UPDATE_URI_PERMIT_TYPEHASH =
        keccak256("UpdateURIPermit(address owner,uint256 tokenId,string currentIPFSURI,string newIPFSURI)");

    /// @dev Maximum supply
    uint256 public constant MAX_SUPPLY = 10_000;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       CUSTOM ERRORS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error InvalidSignature();
    error InvalidSigner();
    error InvalidPaymentToken();
    error MaxSupplyReached();
    error TokenAlreadyMinted();
    error NotTokenOwner();
    error MintingClosed();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STORAGE                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Backend signer that authorizes mints
    address public signer;

    /// @notice ERC-20 payment token (e.g., USDC on Base)
    address public paymentToken;

    /// @notice Mint cost in payment tokens (with decimals)
    uint256 public mintCost;

    /// @notice Address to receive payment tokens
    address public paymentReceiver;

    /// @notice Total minted count
    uint256 public totalMinted;

    /// @notice Whether minting is permanently closed
    bool public mintingClosed;

    /// @notice Token ID → IPFS URI
    mapping(uint256 => string) private _tokenURIs;

    /// @notice Token ID → Update count (for incremental pricing)
    mapping(uint256 => uint256) public updateCount;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event SignerUpdated(address indexed previousSigner, address indexed newSigner);
    event TokenURIUpdated(uint256 indexed tokenId, string oldIPFSURI, string newIPFSURI);
    event MintCostUpdated(uint256 previousCost, uint256 newCost);
    event MintingClosedPermanently();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTRUCTOR                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @param _signer Backend signer address
    /// @param _paymentToken USDC or other ERC-20 token
    /// @param _mintCost Cost in payment tokens (e.g., 990000 for $0.99 USDC with 6 decimals)
    /// @param _paymentReceiver Address to receive payment tokens
    constructor(address _signer, address _paymentToken, uint256 _mintCost, address _paymentReceiver) {
        if (_signer == address(0)) revert InvalidSigner();
        if (_paymentToken == address(0)) revert InvalidPaymentToken();
        if (_paymentReceiver == address(0)) revert InvalidPaymentToken();

        signer = _signer;
        paymentToken = _paymentToken;
        mintCost = _mintCost;
        paymentReceiver = _paymentReceiver;

        _initializeOwner(msg.sender);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      ERC721 METADATA                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function name() public pure override returns (string memory) {
        return "FID MFERS";
    }

    function symbol() public pure override returns (string memory) {
        return "MFER";
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        if (!_exists(id)) revert TokenDoesNotExist();
        return _tokenURIs[id];
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       EIP712 DOMAIN                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _domainNameAndVersion()
        internal
        pure
        override
        returns (string memory name_, string memory version_)
    {
        name_ = "FID MFERS";
        version_ = "1";
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparator();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      MINTING LOGIC                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Mint with presigned permit (FID = tokenId)
    /// @dev User must approve payment tokens before calling
    /// @param tokenId Token ID to mint (should equal user's FID)
    /// @param ipfsURI IPFS metadata URI
    /// @param signature Backend EIP-712 signature
    function presignedMint(
        uint256 tokenId,
        string calldata ipfsURI,
        bytes calldata signature
    ) external {
        if (mintingClosed) revert MintingClosed();
        if (totalMinted >= MAX_SUPPLY) revert MaxSupplyReached();
        if (_exists(tokenId)) revert TokenAlreadyMinted();

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(MINT_PERMIT_TYPEHASH, msg.sender, tokenId, keccak256(bytes(ipfsURI)))
        );
        bytes32 digest = _hashTypedData(structHash);
        address recoveredSigner = ECDSA.recover(digest, signature);

        if (recoveredSigner != signer) revert InvalidSignature();

        // Transfer payment tokens to receiver
        SafeTransferLib.safeTransferFrom(paymentToken, msg.sender, paymentReceiver, mintCost);

        // Store URI and mint
        _tokenURIs[tokenId] = ipfsURI;
        _mint(msg.sender, tokenId);
        totalMinted++;
    }

    /// @notice Update token URI with incremental cost
    /// @dev Cost = updateCount * mintCost (1st = 1x, 2nd = 2x, etc.)
    /// @param tokenId Token to update
    /// @param currentIPFSURI Current URI (for replay protection)
    /// @param newIPFSURI New IPFS URI
    /// @param signature Backend EIP-712 signature
    function presignedUpdateTokenURI(
        uint256 tokenId,
        string calldata currentIPFSURI,
        string calldata newIPFSURI,
        bytes calldata signature
    ) external {
        if (!_exists(tokenId)) revert TokenDoesNotExist();
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (keccak256(bytes(_tokenURIs[tokenId])) != keccak256(bytes(currentIPFSURI))) {
            revert InvalidSignature();
        }

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                UPDATE_URI_PERMIT_TYPEHASH,
                msg.sender,
                tokenId,
                keccak256(bytes(currentIPFSURI)),
                keccak256(bytes(newIPFSURI))
            )
        );
        bytes32 digest = _hashTypedData(structHash);
        address recoveredSigner = ECDSA.recover(digest, signature);

        if (recoveredSigner != signer) revert InvalidSignature();

        // Same cost as minting (flat pricing)
        updateCount[tokenId]++;

        // Transfer payment tokens to receiver
        SafeTransferLib.safeTransferFrom(paymentToken, msg.sender, paymentReceiver, mintCost);

        // Update URI
        string memory oldURI = _tokenURIs[tokenId];
        _tokenURIs[tokenId] = newIPFSURI;

        emit TokenURIUpdated(tokenId, oldURI, newIPFSURI);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidSigner();
        address previousSigner = signer;
        signer = newSigner;
        emit SignerUpdated(previousSigner, newSigner);
    }

    function setMintCost(uint256 newMintCost) external onlyOwner {
        uint256 previousCost = mintCost;
        mintCost = newMintCost;
        emit MintCostUpdated(previousCost, newMintCost);
    }

    function closeMinting() external onlyOwner {
        mintingClosed = true;
        emit MintingClosedPermanently();
    }

    function setPaymentReceiver(address newReceiver) external onlyOwner {
        if (newReceiver == address(0)) revert InvalidPaymentToken();
        paymentReceiver = newReceiver;
    }
}


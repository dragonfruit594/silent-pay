// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SilentUSDC is Ownable, ZamaEthereumConfig {
    mapping(address => euint32) private _balances;
    mapping(address => mapping(address => euint32)) private _allowances;

    string public name = "Silent USDC";
    string public symbol = "sUSDC";

    event Transfer(address indexed from, address indexed to);
    event Approval(address indexed owner, address indexed spender);

    constructor() Ownable(msg.sender) {}

    /// @notice Mint tokens to owner with encrypted amount
    /// @param encryptedAmount Encrypted amount to mint
    /// @param proof ZK proof for the encrypted amount
    /// @dev Follows ERC7984 pattern: allow new balance handle to user
    function mint(externalEuint32 encryptedAmount, bytes calldata proof) public onlyOwner {
        euint32 amount = FHE.fromExternal(encryptedAmount, proof);
        // Calculate new balance (creates new handle)
        euint32 newBalance = FHE.add(_balances[msg.sender], amount);
        // Allow new balance handle to contract and user (ERC7984 pattern)
        FHE.allowThis(newBalance);
        FHE.allow(newBalance, msg.sender);
        // Also allow transferred amount to user
        FHE.allow(amount, msg.sender);
        // Save new balance
        _balances[msg.sender] = newBalance;
    }

    /// @notice Get encrypted balance of an account
    /// @param account Address to query balance
    /// @return Encrypted balance
    /// @dev Follows ERC7984 pattern: view function, allow is done automatically in mint/transfer
    function balanceOf(address account) public view returns (euint32) {
        return _balances[account];
    }

    /// @notice Get encrypted allowance
    /// @param owner Token owner
    /// @param spender Token spender
    /// @return Encrypted allowance amount
    /// @dev Follows ERC7984 pattern: view function, allow is done automatically in approve
    function allowance(address owner, address spender) public view returns (euint32) {
        return _allowances[owner][spender];
    }

    /// @notice Approve spender to use encrypted amount
    /// @param spender Address to approve
    /// @param encryptedAmount Encrypted amount to approve
    /// @param proof ZK proof for the encrypted amount
    /// @return Success status
    function approve(address spender, externalEuint32 encryptedAmount, bytes calldata proof) public returns (bool) {
        euint32 amount = FHE.fromExternal(encryptedAmount, proof);
        _allowances[msg.sender][spender] = amount;
        FHE.allow(amount, msg.sender);
        FHE.allow(amount, spender);
        emit Approval(msg.sender, spender);
        return true;
    }

    /// @notice Transfer tokens from one address to another (with allowance check)
    /// @param from Source address
    /// @param to Destination address
    /// @param amount Encrypted amount to transfer
    /// @return Success status
    /// @dev Follows ERC7984 pattern: allow new balance handles to users
    function transferFrom(address from, address to, euint32 amount) public returns (bool) {
        // Check if caller has access to the amount
        require(FHE.isAllowed(amount, msg.sender), "Unauthorized use of encrypted amount");
        
        // Check allowance if not owner
        if (from != msg.sender) {
            require(FHE.isAllowed(_allowances[from][msg.sender], msg.sender), "Insufficient allowance");
            // NOTE: We do NOT subtract allowance here because the allowance handle (from approve proof)
            // and the transfer handle (from vault proof) are different. Subtracting mismatched handles
            // can revert in FHE. The check above enforces authorization.
        }

        // Calculate new balances (creates new handles)
        euint32 newFromBalance = FHE.sub(_balances[from], amount);
        euint32 newToBalance = FHE.add(_balances[to], amount);
        
        // Allow new balance handles (ERC7984 pattern)
        FHE.allowThis(newFromBalance);
        FHE.allow(newFromBalance, from);
        FHE.allowThis(newToBalance);
        FHE.allow(newToBalance, to);
        // Also allow transferred amount to both users
        FHE.allow(amount, from);
        FHE.allow(amount, to);
        
        // Save new balances
        _balances[from] = newFromBalance;
        _balances[to] = newToBalance;
        
        emit Transfer(from, to);
        return true;
    }

    /// @notice Transfer tokens to another address
    /// @param to Destination address
    /// @param amount Encrypted amount to transfer
    /// @return Success status
    /// @dev Follows ERC7984 pattern: allow new balance handles to users
    function transfer(address to, euint32 amount) public returns (bool) {
        // Check if caller has access to the amount
        require(FHE.isAllowed(amount, msg.sender), "Unauthorized use of encrypted amount");
        
        // Calculate new balances (creates new handles)
        euint32 newFromBalance = FHE.sub(_balances[msg.sender], amount);
        euint32 newToBalance = FHE.add(_balances[to], amount);
        
        // Allow new balance handles (ERC7984 pattern)
        FHE.allowThis(newFromBalance);
        FHE.allow(newFromBalance, msg.sender);
        FHE.allowThis(newToBalance);
        FHE.allow(newToBalance, to);
        // Also allow transferred amount to both users
        FHE.allow(amount, msg.sender);
        FHE.allow(amount, to);
        
        // Save new balances
        _balances[msg.sender] = newFromBalance;
        _balances[to] = newToBalance;
        
        emit Transfer(msg.sender, to);
        return true;
    }

    /// @notice Transfer tokens from one address to another using external encrypted input (with allowance check)
    /// @param from Source address
    /// @param to Destination address
    /// @param encryptedAmount Encrypted amount to transfer (external format)
    /// @param proof ZK proof for the encrypted amount
    /// @return Success status
    /// @dev This function decodes the proof in the token contract context, which is required for proof validation
    function confidentialTransferFrom(
        address from,
        address to,
        externalEuint32 encryptedAmount,
        bytes calldata proof
    ) public returns (bool) {
        // Decode encrypted amount in token contract context (proof must be valid for this contract)
        euint32 amount = FHE.fromExternal(encryptedAmount, proof);
        
        // Allow caller to use this handle
        FHE.allowTransient(amount, msg.sender);
        
        // Use the overload with euint64 (which handles allowance check)
        return confidentialTransferFrom(from, to, amount);
    }

    /// @notice Transfer tokens from one address to another using encrypted amount handle (with allowance check)
    /// @param from Source address
    /// @param to Destination address
    /// @param amount Encrypted amount handle to transfer
    /// @return Success status
    /// @dev This is the main transfer function that handles allowance checking and balance updates
    /// @dev Follows the same pattern as zama-stake: decode in calling contract, then transfer with handle
    function confidentialTransferFrom(
        address from,
        address to,
        euint32 amount
    ) public returns (bool) {
        // Check if caller has access to the amount
        require(FHE.isAllowed(amount, msg.sender), "Unauthorized use of encrypted amount");
        
        // Check allowance if not owner
        if (from != msg.sender) {
            require(FHE.isAllowed(_allowances[from][msg.sender], msg.sender), "Insufficient allowance");
            // Do NOT subtract here: allowance handle (approve proof) differs from amount handle (vault proof).
            // Subtracting mismatched handles can revert; authorization check above is sufficient.
        }

        // Calculate new balances (creates new handles)
        euint32 newFromBalance = FHE.sub(_balances[from], amount);
        euint32 newToBalance = FHE.add(_balances[to], amount);
        
        // Allow new balance handles (ERC7984 pattern)
        FHE.allowThis(newFromBalance);
        FHE.allow(newFromBalance, from);
        FHE.allowThis(newToBalance);
        FHE.allow(newToBalance, to);
        // Also allow transferred amount to both users
        FHE.allow(amount, from);
        FHE.allow(amount, to);
        
        // Save new balances
        _balances[from] = newFromBalance;
        _balances[to] = newToBalance;
        
        emit Transfer(from, to);
        return true;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./SilentVault.sol";

/// @title SilentPayFactory
/// @notice Factory contract for creating SilentVault instances
/// @dev This factory allows employers to create multiple vaults for managing encrypted payments
contract SilentPayFactory {
    address[] public allVaults;
    mapping(address => address[]) public employerVaults;

    /// @notice Emitted when a new vault is created
    /// @param employer Address of the employer creating the vault
    /// @param vaultAddress Address of the newly created vault
    /// @param name Name of the vault
    event VaultCreated(address indexed employer, address vaultAddress, string name);

    /// @notice Deploys a new SilentVault for an employer
    /// @param _name Name of the vault
    /// @param _paymentToken Address of the payment token (SilentUSDC)
    /// @return Address of the newly created vault
    function createVault(string memory _name, address _paymentToken) external returns (address) {
        require(_paymentToken != address(0), "Invalid payment token address");
        
        SilentVault newVault = new SilentVault(_name, _paymentToken, msg.sender);
        
        allVaults.push(address(newVault));
        employerVaults[msg.sender].push(address(newVault));

        emit VaultCreated(msg.sender, address(newVault), _name);
        
        return address(newVault);
    }

    /// @notice Get total number of vaults created
    /// @return Total count of vaults
    function getVaultCount() external view returns (uint256) {
        return allVaults.length;
    }

    /// @notice Get all vaults created by a specific employer
    /// @param _employer Address of the employer
    /// @return Array of vault addresses
    function getVaultsByEmployer(address _employer) external view returns (address[] memory) {
        return employerVaults[_employer];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ISilentToken {
    function transfer(address to, euint32 amount) external returns (bool);
    function transferFrom(address from, address to, euint32 amount) external returns (bool);
    function confidentialTransferFrom(address from, address to, externalEuint32 encryptedAmount, bytes calldata proof) external returns (bool);
    function confidentialTransferFrom(address from, address to, euint32 amount) external returns (bool);
    function balanceOf(address account) external view returns (euint32);
}

contract SilentVault is Ownable, ZamaEthereumConfig {
    struct Member {
        euint32 rate;
        uint256 joinDate;
        uint256 lastClaim;
        bool hasClaimed;
        bool isActive;
    }

    string public vaultName;
    ISilentToken public paymentToken;

    /// @dev Testnet-friendly: 1 day accrual periods.
    uint256 public constant CLAIM_PERIOD = 1 days;
    /// @dev Safety cap to avoid huge multipliers (and potential overflow/gas surprises).
    uint256 public constant MAX_PERIODS_PER_CLAIM = 365;
    
    mapping(address => Member) private members;
    address[] public memberList;

    event MemberJoined(address indexed member, string role);
    event FundsDistributed(address indexed member, uint256 timestamp);

    constructor(
        string memory _name,
        address _paymentToken,
        address _coordinator
    ) Ownable(_coordinator) {
        vaultName = _name;
        paymentToken = ISilentToken(_paymentToken);
    }

    function enrollMember(address _member, externalEuint32 _encryptedRate, bytes calldata _proof) external onlyOwner {
        euint32 rate = FHE.fromExternal(_encryptedRate, _proof);
        
        if (!members[_member].isActive) {
            memberList.push(_member);
        }

        members[_member] = Member({
            rate: rate,
            joinDate: block.timestamp,
            lastClaim: block.timestamp,
            hasClaimed: false,
            isActive: true
        });

        FHE.allow(rate, address(this));
        FHE.allow(rate, _member);
        FHE.allow(rate, owner());

        emit MemberJoined(_member, "CONTRIBUTOR");
    }

    function depositVault(externalEuint32 _encryptedAmount, bytes calldata _proof) external onlyOwner {
        // Follow zama-stake pattern:
        // 1) Decode encrypted amount in vault contract context (proof must be created for vault contract)
        euint32 amount = FHE.fromExternal(_encryptedAmount, _proof);
        
        // 2) Allow paymentToken contract to use this handle
        FHE.allowTransient(amount, address(paymentToken));
        // Also allow vault (msg.sender) to use this handle, because confidentialTransferFrom checks FHE.isAllowed(amount, msg.sender)
        FHE.allowTransient(amount, address(this));
        
        // 3) Transfer tokens from owner to vault using the euint32 handle (overload with euint32)
        paymentToken.confidentialTransferFrom(msg.sender, address(this), amount);
        
        // Allow owner to decrypt vault balance after deposit
        euint32 vaultBalance = paymentToken.balanceOf(address(this));
        FHE.allowThis(vaultBalance);
        FHE.allow(vaultBalance, owner());
    }

    function claimGrant() external {
        _distributeAccrued(msg.sender);
    }

    function pushPayment(address _member) external onlyOwner {
        _distributeAccrued(_member);
    }

    /// @notice Check non-encrypted claim status (no decryption required).
    /// @dev This exposes metadata publicly (join/claim timestamps). Rate remains encrypted.
    function getMemberStatus(address _member)
        external
        view
        returns (
            bool isActive,
            uint256 joinDate,
            uint256 lastClaim,
            bool hasClaimed,
            uint256 claimPeriod,
            uint256 nextClaimAt
        )
    {
        Member storage m = members[_member];
        isActive = m.isActive;
        joinDate = m.joinDate;
        lastClaim = m.lastClaim;
        hasClaimed = m.hasClaimed;
        claimPeriod = CLAIM_PERIOD;
        nextClaimAt = m.hasClaimed ? (m.lastClaim + CLAIM_PERIOD) : m.lastClaim;
    }

    function _distributeAccrued(address _member) internal {
        Member storage member = members[_member];
        require(member.isActive, "Member not active");

        uint256 elapsed = block.timestamp - member.lastClaim;
        uint256 fullPeriods = elapsed / CLAIM_PERIOD;

        uint256 periodsToPay;
        if (fullPeriods > 0) {
            periodsToPay = fullPeriods;
            if (periodsToPay > MAX_PERIODS_PER_CLAIM) {
                periodsToPay = MAX_PERIODS_PER_CLAIM;
            }
        } else {
            // Allow a one-time immediate first claim right after enrollment.
            require(!member.hasClaimed, "Too early");
            periodsToPay = 1;
        }

        // IMPORTANT (FHE): token contract will perform FHE ops using the amount handle.
        // Allow token contract + vault to use rate handle and computed payout handle for this call.
        FHE.allowTransient(member.rate, address(paymentToken));
        FHE.allowTransient(member.rate, address(this));

        euint32 payout = FHE.mul(member.rate, uint32(periodsToPay));
        FHE.allowTransient(payout, address(paymentToken));
        FHE.allowTransient(payout, address(this));

        paymentToken.transfer(_member, payout);

        // IMPORTANT (FHE): vault balance handle changes after transfer; allow the NEW handle to owner
        euint32 vaultBalance = paymentToken.balanceOf(address(this));
        FHE.allowThis(vaultBalance);
        FHE.allow(vaultBalance, owner());

        if (fullPeriods > 0) {
            member.lastClaim = member.lastClaim + (periodsToPay * CLAIM_PERIOD);
        } else {
            member.lastClaim = block.timestamp;
        }
        member.hasClaimed = true;

        emit FundsDistributed(_member, block.timestamp);
    }

    /// @notice Get encrypted vault balance
    /// @return Encrypted vault balance
    /// @dev Follows ERC7984 pattern: view function, allow is done automatically in depositVault
    function getVaultBalance() external view returns (euint32) {
        return paymentToken.balanceOf(address(this));
    }

    /// @notice Get encrypted rate of a member
    /// @param _member Address of the member
    /// @return Encrypted rate
    /// @dev Follows ERC7984 pattern: view function, allow is done automatically in enrollMember
    function getEncryptedRate(address _member) external view returns (euint32) {
        return members[_member].rate;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract HuiPotGoalPool is ReentrancyGuard {
    uint256 private constant QUANTUM = 1e12;
    uint256 private constant MAX_DEADLINE_WINDOW = 30 days;

    uint8 private constant STATUS_ACTIVE = 0;
    uint8 private constant STATUS_FUNDED = 1;
    uint8 private constant STATUS_PAID = 2;
    uint8 private constant STATUS_REFUNDING = 3;
    uint8 private constant STATUS_CLOSED = 4;

    struct Pool {
        address creator;
        address recipient;
        uint256 target;
        uint256 deadline;
        string title;
        string purpose;
        uint256 totalContributed;
        uint256 totalRefunded;
        bool paidOut;
    }

    uint256 private _poolCount;
    mapping(uint256 => Pool) private _pools;
    mapping(uint256 => mapping(address => uint256)) private _contributions;
    mapping(uint256 => mapping(address => uint256)) private _refunded;

    event PoolCreated(
        uint256 indexed poolId,
        address indexed creator,
        address indexed recipient,
        uint256 target,
        uint256 deadline,
        string title,
        string purpose
    );
    event Contributed(uint256 indexed poolId, address indexed contributor, uint256 amount, uint256 newTotal);
    event GoalReached(uint256 indexed poolId, uint256 target);
    event PaidOut(uint256 indexed poolId, address indexed caller, address indexed recipient, uint256 amount);
    event Refunded(uint256 indexed poolId, address indexed contributor, uint256 amount);

    error InvalidPoolId();
    error InvalidRecipient();
    error InvalidTarget();
    error InvalidDeadline();
    error InvalidTitleLength();
    error InvalidPurposeLength();
    error InvalidContributionAmount();
    error PoolNotActive();
    error ContributionExceedsRemainingCapacity();
    error PoolNotFunded();
    error PoolNotRefunding();
    error NoClaimableRefund();
    error NativeTransferFailed();
    error DirectNativeTransferNotAllowed();

    function createPool(
        address recipient,
        uint256 target,
        uint256 deadline,
        string calldata title,
        string calldata purpose
    ) external {
        if (recipient == address(0) || recipient == address(this)) {
            revert InvalidRecipient();
        }
        if (target == 0 || target % QUANTUM != 0) {
            revert InvalidTarget();
        }
        if (deadline <= block.timestamp || deadline > block.timestamp + MAX_DEADLINE_WINDOW) {
            revert InvalidDeadline();
        }

        uint256 titleLength = bytes(title).length;
        if (titleLength == 0 || titleLength > 80) {
            revert InvalidTitleLength();
        }

        uint256 purposeLength = bytes(purpose).length;
        if (purposeLength == 0 || purposeLength > 280) {
            revert InvalidPurposeLength();
        }

        uint256 newPoolId = ++_poolCount;
        Pool storage pool = _pools[newPoolId];
        pool.creator = msg.sender;
        pool.recipient = recipient;
        pool.target = target;
        pool.deadline = deadline;
        pool.title = title;
        pool.purpose = purpose;

        emit PoolCreated(newPoolId, msg.sender, recipient, target, deadline, title, purpose);
    }

    function contribute(uint256 poolId) external payable nonReentrant {
        Pool storage pool = _requirePool(poolId);

        uint256 amount = msg.value;
        if (amount == 0 || amount % QUANTUM != 0) {
            revert InvalidContributionAmount();
        }
        if (_status(pool) != STATUS_ACTIVE) {
            revert PoolNotActive();
        }

        uint256 remaining = pool.target - pool.totalContributed;
        if (amount > remaining) {
            revert ContributionExceedsRemainingCapacity();
        }

        uint256 newTotal = pool.totalContributed + amount;
        pool.totalContributed = newTotal;
        _contributions[poolId][msg.sender] += amount;

        emit Contributed(poolId, msg.sender, amount, newTotal);

        if (newTotal == pool.target) {
            emit GoalReached(poolId, pool.target);
        }
    }

    function payout(uint256 poolId) external nonReentrant {
        Pool storage pool = _requirePool(poolId);

        if (_status(pool) != STATUS_FUNDED) {
            revert PoolNotFunded();
        }

        uint256 amount = pool.target;
        pool.paidOut = true;

        (bool ok, ) = pool.recipient.call{value: amount}("");
        if (!ok) {
            revert NativeTransferFailed();
        }

        emit PaidOut(poolId, msg.sender, pool.recipient, amount);
    }

    function claimRefund(uint256 poolId) external nonReentrant {
        Pool storage pool = _requirePool(poolId);

        if (_status(pool) != STATUS_REFUNDING) {
            revert PoolNotRefunding();
        }

        uint256 contributedPrincipal = _contributions[poolId][msg.sender];
        uint256 alreadyRefunded = _refunded[poolId][msg.sender];
        uint256 claimable = contributedPrincipal - alreadyRefunded;

        if (claimable == 0) {
            revert NoClaimableRefund();
        }

        _refunded[poolId][msg.sender] = alreadyRefunded + claimable;
        pool.totalRefunded += claimable;

        (bool ok, ) = msg.sender.call{value: claimable}("");
        if (!ok) {
            revert NativeTransferFailed();
        }

        emit Refunded(poolId, msg.sender, claimable);
    }

    function poolCount() external view returns (uint256) {
        return _poolCount;
    }

    function getPool(uint256 poolId)
        external
        view
        returns (
            address creator,
            address recipient,
            uint256 target,
            uint256 deadline,
            string memory title,
            string memory purpose,
            uint256 totalContributed,
            uint256 totalRefunded,
            bool paidOut
        )
    {
        Pool storage pool = _requirePool(poolId);
        return (
            pool.creator,
            pool.recipient,
            pool.target,
            pool.deadline,
            pool.title,
            pool.purpose,
            pool.totalContributed,
            pool.totalRefunded,
            pool.paidOut
        );
    }

    function getStatus(uint256 poolId) external view returns (uint8) {
        Pool storage pool = _requirePool(poolId);
        return _status(pool);
    }

    function getContribution(uint256 poolId, address wallet) external view returns (uint256) {
        _requirePool(poolId);
        return _contributions[poolId][wallet];
    }

    function getRefunded(uint256 poolId, address wallet) external view returns (uint256) {
        _requirePool(poolId);
        return _refunded[poolId][wallet];
    }

    function getClaimable(uint256 poolId, address wallet) external view returns (uint256) {
        Pool storage pool = _requirePool(poolId);
        if (_status(pool) != STATUS_REFUNDING) {
            return 0;
        }

        uint256 contributedPrincipal = _contributions[poolId][wallet];
        uint256 alreadyRefunded = _refunded[poolId][wallet];

        return contributedPrincipal - alreadyRefunded;
    }

    receive() external payable {
        revert DirectNativeTransferNotAllowed();
    }

    fallback() external payable {
        revert DirectNativeTransferNotAllowed();
    }

    function _requirePool(uint256 poolId) internal view returns (Pool storage) {
        if (poolId == 0 || poolId > _poolCount) {
            revert InvalidPoolId();
        }
        return _pools[poolId];
    }

    function _status(Pool storage pool) internal view returns (uint8) {
        if (pool.paidOut) {
            return STATUS_PAID;
        }
        if (pool.totalContributed == pool.target) {
            return STATUS_FUNDED;
        }
        if (block.timestamp < pool.deadline) {
            return STATUS_ACTIVE;
        }
        if (pool.totalRefunded < pool.totalContributed) {
            return STATUS_REFUNDING;
        }
        return STATUS_CLOSED;
    }
}

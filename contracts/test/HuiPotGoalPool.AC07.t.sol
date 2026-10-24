// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {HuiPotGoalPoolBase} from "./HuiPotGoalPool.Base.t.sol";
import {HuiPotGoalPool} from "../HuiPotGoalPool.sol";

// ── adversarial helpers ────────────────────────────────────────────────────

/// Recipient that always reverts on receive.
contract RejectingRecipient {
    receive() external payable {
        revert("I reject ETH");
    }
}

/// Recipient that tries to re-enter payout on receive.
contract ReentrantPayoutRecipient {
    HuiPotGoalPool public pool;
    uint256        public poolId;
    uint256        public callCount;

    constructor(HuiPotGoalPool _pool) { pool = _pool; }

    function setPoolId(uint256 _pid) external { poolId = _pid; }

    receive() external payable {
        if (callCount == 0) {
            callCount++;
            // attempt reentrant payout
            pool.payout(poolId);
        }
    }
}

/// Recipient that tries to contribute to another pool on receive.
contract CrossPoolReentrantRecipient {
    HuiPotGoalPool public pool;
    uint256        public targetPoolId;
    uint256        public callCount;

    constructor(HuiPotGoalPool _pool) { pool = _pool; }

    function setup(uint256 _pid) external { targetPoolId = _pid; }

    receive() external payable {
        if (callCount == 0) {
            callCount++;
            pool.contribute{value: 1e12}(targetPoolId);
        }
    }
}

/// Contributor that always reverts on receive (for claimRefund adversarial).
contract RejectingContributor {
    HuiPotGoalPool public pool;

    constructor(HuiPotGoalPool _pool) {
        pool = _pool;
    }

    function contribute(uint256 pid, uint256 amt) external payable {
        pool.contribute{value: amt}(pid);
    }

    function claimRefund(uint256 pid) external {
        pool.claimRefund(pid);
    }

    receive() external payable {
        revert("I reject ETH");
    }
}

/// Contributor that tries to re-enter claimRefund on receive.
contract ReentrantClaimRecipient {
    HuiPotGoalPool public pool;
    uint256        public poolId;
    uint256        public callCount;

    constructor(HuiPotGoalPool _pool) { pool = _pool; }

    function setPoolId(uint256 _pid) external { poolId = _pid; }

    function contribute(uint256 amt) external payable {
        pool.contribute{value: amt}(poolId);
    }

    function claimRefund() external {
        pool.claimRefund(poolId);
    }

    receive() external payable {
        if (callCount == 0) {
            callCount++;
            pool.claimRefund(poolId);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────

contract HuiPotGoalPool_AC07 is HuiPotGoalPoolBase {

    // ── rejecting recipient ────────────────────────────────────────────────────

    function test_AC07_RejectingRecipient_PayoutReverts() public {
        RejectingRecipient rr = new RejectingRecipient();
        vm.prank(creator);
        pool.createPool(address(rr), TARGET, DEADLINE, "Rej", "Rej purpose");
        uint256 pid = pool.poolCount();

        vm.deal(alice, 1000 * ONE_USDC);
        _contribute(pid, alice, TARGET);

        vm.expectRevert(HuiPotGoalPool.NativeTransferFailed.selector);
        pool.payout(pid);

        // paidOut must still be false
        (,,,,,,,, bool po) = pool.getPool(pid);
        assertFalse(po);
    }

    // ── reentrant payout ──────────────────────────────────────────────────────

    function test_AC07_ReentrantPayout_BlockedByReentrancyGuard() public {
        // The contract uses CEI: paidOut=true is set BEFORE the .call.
        // The reentrant payout inside receive() hits the reentrancy guard,
        // which causes receive() to revert, which propagates as NativeTransferFailed.
        // Net result: payout reverts (no ETH sent, paidOut is reset by revert).
        // This is the correct security property: reentrant recipient cannot double-pay.
        ReentrantPayoutRecipient rpr = new ReentrantPayoutRecipient(pool);

        vm.prank(creator);
        pool.createPool(address(rpr), TARGET, DEADLINE, "Reent", "Reent purpose");
        uint256 pid = pool.poolCount();
        rpr.setPoolId(pid);

        vm.deal(alice, 1000 * ONE_USDC);
        _contribute(pid, alice, TARGET);

        // Reentrant recipient causes payout to revert with NativeTransferFailed
        vm.expectRevert(HuiPotGoalPool.NativeTransferFailed.selector);
        pool.payout(pid);

        // State is unchanged: paidOut is still false (Solidity reverted the storage write too)
        (,,,,,,,, bool po) = pool.getPool(pid);
        assertFalse(po, "paidOut must still be false after reverted payout");
    }

    // ── cross-pool reentrant contribute during payout ─────────────────────────

    function test_AC07_CrossPoolReentrant_Contribute_DuringPayout() public {
        // The reentrant recipient tries to call contribute() on a second pool
        // inside its receive(). The contract-level reentrancy guard (OZ default)
        // blocks the inner contribute(), causing receive() to revert, which
        // causes the outer payout() to revert with NativeTransferFailed.
        // Net: cross-pool reentrancy is blocked; neither pool is corrupted.
        uint256 pid2 = _createDefault(); // a second pool (pid=1 from base)

        CrossPoolReentrantRecipient cpr = new CrossPoolReentrantRecipient(pool);
        vm.deal(address(cpr), 1000 * ONE_USDC);
        cpr.setup(pid2);

        vm.prank(creator);
        pool.createPool(address(cpr), TARGET, DEADLINE, "Cross", "Cross purpose");
        uint256 pid1 = pool.poolCount();

        vm.deal(alice, 1000 * ONE_USDC);
        _contribute(pid1, alice, TARGET);

        // payout reverts because cross-pool reentrancy is blocked
        vm.expectRevert(HuiPotGoalPool.NativeTransferFailed.selector);
        pool.payout(pid1);

        // pid1: paidOut is still false
        (,,,,,,,, bool po1) = pool.getPool(pid1);
        assertFalse(po1, "pid1 paidOut must be false after reverted payout");

        // pid2: no contribution was credited from the callback
        assertEq(pool.getContribution(pid2, address(cpr)), 0, "cross-pool reentrancy must not credit pid2");
    }

    // ── rejecting contributor claimRefund ─────────────────────────────────────

    function test_AC07_RejectingContributor_ClaimRefundReverts() public {
        RejectingContributor rc = new RejectingContributor(pool);
        vm.deal(address(rc), 1000 * ONE_USDC);

        uint256 pid = _createDefault();
        rc.contribute{value: ONE_USDC}(pid, ONE_USDC);

        _warpPastDeadline(pid);

        // claimRefund calls rc's receive() which reverts
        vm.expectRevert(HuiPotGoalPool.NativeTransferFailed.selector);
        rc.claimRefund(pid);

        // state must be unchanged: refunded should still be 0
        assertEq(pool.getRefunded(pid, address(rc)), 0);
    }

    // ── reentrant claimRefund ──────────────────────────────────────────────────

    function test_AC07_ReentrantClaimRefund_BlockedByReentrancyGuard() public {
        // CEI pattern: _refunded is written before .call. But reentrancy guard
        // also blocks the inner call at the function entry point.
        // The inner claimRefund hits the reentrancy guard → reverts →
        // receive() reverts → outer claimRefund reverts with NativeTransferFailed.
        // Net: no ETH sent, no state change — double-claim is impossible.
        ReentrantClaimRecipient rcr = new ReentrantClaimRecipient(pool);
        vm.deal(address(rcr), 1000 * ONE_USDC);

        uint256 pid = _createDefault();
        rcr.setPoolId(pid);
        rcr.contribute{value: 2 * ONE_USDC}(2 * ONE_USDC);

        _warpPastDeadline(pid);

        // Reentrant receiver causes claimRefund to revert with NativeTransferFailed
        vm.expectRevert(HuiPotGoalPool.NativeTransferFailed.selector);
        rcr.claimRefund();

        // State must be unchanged: _refunded is still 0 (Solidity reverted the write)
        assertEq(pool.getRefunded(pid, address(rcr)), 0, "refunded must be 0 after reverted claim");
    }
}

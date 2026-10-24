// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {HuiPotGoalPoolBase} from "./HuiPotGoalPool.Base.t.sol";
import {HuiPotGoalPool} from "../HuiPotGoalPool.sol";

contract HuiPotGoalPool_AC0506 is HuiPotGoalPoolBase {

    uint256 internal pid;

    function setUp() public override {
        super.setUp();
        pid = _createDefault(); // TARGET = 10 ONE_USDC
    }

    // ════════════════════════════════════════════════════════════════════════
    // AC05 — claimRefund
    // ════════════════════════════════════════════════════════════════════════

    function _setupRefunding() internal {
        _contribute(pid, alice, 3 * ONE_USDC);
        _contribute(pid, bob,   2 * ONE_USDC);
        _warpPastDeadline(pid);
        assertEq(pool.getStatus(pid), STATUS_REFUNDING);
    }

    function test_AC05_ClaimRefund_FullPrincipal() public {
        _setupRefunding();
        uint256 before = alice.balance;
        vm.prank(alice);
        pool.claimRefund(pid);
        assertEq(alice.balance - before, 3 * ONE_USDC);
        assertEq(pool.getRefunded(pid, alice), 3 * ONE_USDC);
    }

    function test_AC05_ClaimRefund_EmitsRefunded() public {
        _setupRefunding();
        vm.expectEmit(true, true, false, true, address(pool));
        emit HuiPotGoalPool.Refunded(pid, alice, 3 * ONE_USDC);
        vm.prank(alice);
        pool.claimRefund(pid);
    }

    function test_AC05_Revert_OtherWalletCannotClaim() public {
        _setupRefunding();
        // carol contributed nothing
        vm.prank(carol);
        vm.expectRevert(HuiPotGoalPool.NoClaimableRefund.selector);
        pool.claimRefund(pid);
    }

    function test_AC05_Revert_NoClaimBeforeExpiry() public {
        _contribute(pid, alice, ONE_USDC);
        // still active
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.PoolNotRefunding.selector);
        pool.claimRefund(pid);
    }

    function test_AC05_Revert_NoClaimAfterGoalMet() public {
        _fillPool(pid);
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.PoolNotRefunding.selector);
        pool.claimRefund(pid);
    }

    function test_AC05_FinalRefund_MovesToClosed() public {
        _contribute(pid, alice, 2 * ONE_USDC);
        _warpPastDeadline(pid);
        vm.prank(alice);
        pool.claimRefund(pid);
        // totalRefunded == totalContributed → STATUS_CLOSED
        assertEq(pool.getStatus(pid), STATUS_CLOSED);
    }

    function test_AC05_ZeroDepositPool_AlreadyClosed_NoTx() public {
        // zero-deposit pool past deadline → STATUS_CLOSED immediately
        _warpPastDeadline(pid);
        assertEq(pool.getStatus(pid), STATUS_CLOSED);
    }

    function test_AC05_Revert_RepeatedClaim() public {
        _setupRefunding();
        vm.prank(alice);
        pool.claimRefund(pid);
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.NoClaimableRefund.selector);
        pool.claimRefund(pid);
    }

    function test_AC05_Revert_ClaimOnInvalidPool() public {
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.InvalidPoolId.selector);
        pool.claimRefund(999);
    }

    function test_AC05_GetClaimable_ReturnsCorrectAmount() public {
        _contribute(pid, alice, 3 * ONE_USDC);
        _warpPastDeadline(pid);
        assertEq(pool.getClaimable(pid, alice), 3 * ONE_USDC);
    }

    function test_AC05_GetClaimable_ZeroAfterClaim() public {
        _contribute(pid, alice, 3 * ONE_USDC);
        _warpPastDeadline(pid);
        vm.prank(alice);
        pool.claimRefund(pid);
        assertEq(pool.getClaimable(pid, alice), 0);
    }

    function test_AC05_MultiContributor_EachClaimsIndependently() public {
        _contribute(pid, alice, 3 * ONE_USDC);
        _contribute(pid, bob,   2 * ONE_USDC);
        _warpPastDeadline(pid);

        uint256 aliceBefore = alice.balance;
        uint256 bobBefore   = bob.balance;

        vm.prank(alice);
        pool.claimRefund(pid);
        vm.prank(bob);
        pool.claimRefund(pid);

        assertEq(alice.balance - aliceBefore, 3 * ONE_USDC);
        assertEq(bob.balance   - bobBefore,   2 * ONE_USDC);
        assertEq(pool.getStatus(pid), STATUS_CLOSED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // AC06 — multi-pool isolation
    // ════════════════════════════════════════════════════════════════════════

    function test_AC06_PoolsAreIsolated_ContributionsNotShared() public {
        uint256 pid2 = _createDefault();
        _contribute(pid,  alice, ONE_USDC);
        _contribute(pid2, bob,   2 * ONE_USDC);

        assertEq(pool.getContribution(pid,  alice), ONE_USDC);
        assertEq(pool.getContribution(pid2, alice), 0);
        assertEq(pool.getContribution(pid,  bob),   0);
        assertEq(pool.getContribution(pid2, bob),   2 * ONE_USDC);
    }

    function test_AC06_PoolsIsolated_FillingOneDoesNotAffectOther() public {
        uint256 pid2 = _createDefault();
        _fillPool(pid);
        assertEq(pool.getStatus(pid),  STATUS_FUNDED);
        assertEq(pool.getStatus(pid2), STATUS_ACTIVE);
    }

    function test_AC06_AccountingInvariants_AcrossMultiplePools() public {
        uint256 pid2 = _createDefault();
        _contribute(pid,  alice, 3 * ONE_USDC);
        _contribute(pid,  bob,   2 * ONE_USDC);
        _contribute(pid2, alice, ONE_USDC);

        (,,,,,, uint256 tc1, uint256 tr1, ) = pool.getPool(pid);
        (,,,,,, uint256 tc2, uint256 tr2, ) = pool.getPool(pid2);

        assertEq(tc1, 5 * ONE_USDC);
        assertEq(tr1, 0);
        assertEq(tc2, ONE_USDC);
        assertEq(tr2, 0);

        // warp both past deadline
        _warpPastDeadline(pid);

        vm.prank(alice);
        pool.claimRefund(pid);
        vm.prank(bob);
        pool.claimRefund(pid);

        (,,,,,, uint256 tc1b, uint256 tr1b, ) = pool.getPool(pid);
        assertEq(tr1b, tc1b); // all refunded for pool 1
        // pool 2 unaffected
        (,,,,,, uint256 tc2b, uint256 tr2b, ) = pool.getPool(pid2);
        assertEq(tc2b, ONE_USDC);
        assertEq(tr2b, 0);
    }

    function test_AC06_DirectETHTransfer_Reverts() public {
        // receive() and fallback() both revert with DirectNativeTransferNotAllowed
        vm.deal(address(this), 1 ether);
        vm.expectRevert(HuiPotGoalPool.DirectNativeTransferNotAllowed.selector);
        payable(address(pool)).transfer(1);
    }

    function test_AC06_DirectETHFallback_Reverts() public {
        // Call with unknown selector + value → fallback
        vm.deal(address(this), 1 ether);
        (bool ok, ) = address(pool).call{value: 1 ether}(hex"deadbeef");
        assertFalse(ok);
    }

    function test_AC06_ContractBalanceMatchesDeposits() public {
        _contribute(pid, alice, 3 * ONE_USDC);
        _contribute(pid, bob,   2 * ONE_USDC);
        assertEq(address(pool).balance, 5 * ONE_USDC);
    }

    function test_AC06_Invariant_LiabilityNeverNegative() public {
        _contribute(pid, alice, 3 * ONE_USDC);
        _contribute(pid, bob,   2 * ONE_USDC);
        _warpPastDeadline(pid);

        vm.prank(alice);
        pool.claimRefund(pid);

        (,,,,,, uint256 tc, uint256 tr, ) = pool.getPool(pid);
        // liability = tc - tr >= 0
        assertGe(tc, tr);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {HuiPotGoalPoolBase} from "./HuiPotGoalPool.Base.t.sol";
import {HuiPotGoalPool} from "../HuiPotGoalPool.sol";

contract HuiPotGoalPool_AC0304 is HuiPotGoalPoolBase {

    uint256 internal pid;

    function setUp() public override {
        super.setUp();
        pid = _createDefault(); // TARGET = 10 ONE_USDC, DEADLINE = now + 7 days
    }

    // ════════════════════════════════════════════════════════════════════════
    // AC03 — time boundaries
    // ════════════════════════════════════════════════════════════════════════

    function test_AC03_ContributeJustBeforeDeadline_Succeeds() public {
        (,,,uint256 dl,,,,, ) = pool.getPool(pid);
        vm.warp(dl - 1);
        _contribute(pid, alice, ONE_USDC);
        assertEq(pool.getContribution(pid, alice), ONE_USDC);
    }

    function test_AC03_ContributeAtDeadline_Fails() public {
        (,,,uint256 dl,,,,, ) = pool.getPool(pid);
        vm.warp(dl);
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.PoolNotActive.selector);
        pool.contribute{value: ONE_USDC}(pid);
    }

    function test_AC03_ContributeAfterDeadline_Fails() public {
        _warpPastDeadline(pid);
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.PoolNotActive.selector);
        pool.contribute{value: ONE_USDC}(pid);
    }

    function test_AC03_UnderfundedRefundsOpen_AtDeadline() public {
        _contribute(pid, alice, ONE_USDC);
        _warpToDeadline(pid);
        // Pool is now in REFUNDING state (not fully funded, past deadline)
        assertEq(pool.getStatus(pid), STATUS_REFUNDING);
    }

    function test_AC03_UnderfundedRefundsOpen_AfterDeadline() public {
        _contribute(pid, alice, ONE_USDC);
        _warpPastDeadline(pid);
        assertEq(pool.getStatus(pid), STATUS_REFUNDING);
    }

    function test_AC03_FundedPool_StaysFunded_AfterDeadline() public {
        _fillPool(pid);
        _warpPastDeadline(pid);
        assertEq(pool.getStatus(pid), STATUS_FUNDED);
    }

    function test_AC03_ZeroDepositPool_ClosedAtDeadline_NoTx() public {
        // No contributions — pool transitions to CLOSED at deadline without any tx
        _warpToDeadline(pid);
        // totalContributed == 0 == totalRefunded → STATUS_CLOSED
        assertEq(pool.getStatus(pid), STATUS_CLOSED);
    }

    function test_AC03_ZeroDepositPool_ClosedAfterDeadline_NoTx() public {
        _warpPastDeadline(pid);
        assertEq(pool.getStatus(pid), STATUS_CLOSED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // AC04 — payout
    // ════════════════════════════════════════════════════════════════════════

    function test_AC04_Payout_AnyCaller_SendsTargetToRecipient() public {
        _fillPool(pid);
        uint256 recipientBefore = recipient.balance;
        vm.prank(stranger);
        pool.payout(pid);
        assertEq(recipient.balance - recipientBefore, TARGET);
    }

    function test_AC04_Payout_StatusIsPaid() public {
        _fillPool(pid);
        vm.prank(stranger);
        pool.payout(pid);
        assertEq(pool.getStatus(pid), STATUS_PAID);
    }

    function test_AC04_Payout_EmitsPaidOut() public {
        _fillPool(pid);
        vm.expectEmit(true, true, true, true, address(pool));
        emit HuiPotGoalPool.PaidOut(pid, stranger, recipient, TARGET);
        vm.prank(stranger);
        pool.payout(pid);
    }

    function test_AC04_Payout_PaidOutFieldIsTrue() public {
        _fillPool(pid);
        vm.prank(stranger);
        pool.payout(pid);
        (,,,,,,,, bool po) = pool.getPool(pid);
        assertTrue(po);
    }

    function test_AC04_Revert_PayoutEarly_Active() public {
        // pool is still ACTIVE (not fully funded, not past deadline)
        vm.prank(stranger);
        vm.expectRevert(HuiPotGoalPool.PoolNotFunded.selector);
        pool.payout(pid);
    }

    function test_AC04_Revert_PayoutAlreadyPaid() public {
        _fillPool(pid);
        vm.prank(stranger);
        pool.payout(pid);
        vm.prank(bob);
        vm.expectRevert(HuiPotGoalPool.PoolNotFunded.selector);
        pool.payout(pid);
    }

    function test_AC04_Revert_ContributeAfterPayout() public {
        _fillPool(pid);
        pool.payout(pid);
        vm.prank(bob);
        vm.expectRevert(HuiPotGoalPool.PoolNotActive.selector);
        pool.contribute{value: ONE_USDC}(pid);
    }

    function test_AC04_Revert_ClaimRefundAfterPayout() public {
        _fillPool(pid);
        pool.payout(pid);
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.PoolNotRefunding.selector);
        pool.claimRefund(pid);
    }

    function test_AC04_Revert_SecondPayoutAfterPayout() public {
        _fillPool(pid);
        pool.payout(pid);
        vm.expectRevert(HuiPotGoalPool.PoolNotFunded.selector);
        pool.payout(pid);
    }

    function test_AC04_BalanceDelta_GasAccounted() public {
        _fillPool(pid);
        uint256 recipientBefore = recipient.balance;
        uint256 contractBefore  = address(pool).balance;
        vm.prank(stranger);
        pool.payout(pid);
        assertEq(recipient.balance, recipientBefore + TARGET);
        assertEq(address(pool).balance, contractBefore - TARGET);
    }

    function test_AC04_RecipientEqualsCaller() public {
        // Create a pool where caller == recipient
        vm.prank(creator);
        pool.createPool(recipient, TARGET, DEADLINE, "Self", "Self purpose");
        uint256 pid2 = pool.poolCount();
        _fillPool(pid2);
        uint256 before = recipient.balance;
        vm.prank(recipient); // recipient calls payout on their own pool
        pool.payout(pid2);
        assertEq(recipient.balance - before, TARGET);
    }

    function test_AC04_Revert_PayoutOnInvalidPool() public {
        vm.expectRevert(HuiPotGoalPool.InvalidPoolId.selector);
        pool.payout(999);
    }
}

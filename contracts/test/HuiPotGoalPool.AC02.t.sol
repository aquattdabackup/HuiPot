// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {HuiPotGoalPoolBase} from "./HuiPotGoalPool.Base.t.sol";
import {HuiPotGoalPool} from "../HuiPotGoalPool.sol";

contract HuiPotGoalPool_AC02 is HuiPotGoalPoolBase {

    uint256 internal pid;

    function setUp() public override {
        super.setUp();
        pid = _createDefault(); // TARGET = 10 ONE_USDC
    }

    // ── multiple wallets accumulating ─────────────────────────────────────────

    function test_AC02_MultiWallet_AccumulatesTotal() public {
        uint256 amt = 2 * ONE_USDC;
        _contribute(pid, alice, amt);
        _contribute(pid, bob,   amt);
        _contribute(pid, carol, amt);

        (,,,,,, uint256 totalContributed,, ) = pool.getPool(pid);
        assertEq(totalContributed, 3 * amt);
        assertEq(pool.getContribution(pid, alice), amt);
        assertEq(pool.getContribution(pid, bob),   amt);
        assertEq(pool.getContribution(pid, carol),  amt);
    }

    // ── repeated contributions from same wallet ───────────────────────────────

    function test_AC02_RepeatedContributions_Accumulate() public {
        uint256 amt = ONE_USDC;
        _contribute(pid, alice, amt);
        _contribute(pid, alice, amt);
        _contribute(pid, alice, amt);

        assertEq(pool.getContribution(pid, alice), 3 * amt);
        (,,,,,, uint256 totalContributed,, ) = pool.getPool(pid);
        assertEq(totalContributed, 3 * amt);
    }

    // ── zero deposit revert ───────────────────────────────────────────────────

    function test_AC02_Revert_ZeroDeposit() public {
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.InvalidContributionAmount.selector);
        pool.contribute{value: 0}(pid);
    }

    // ── non-quantum deposit revert ────────────────────────────────────────────

    function test_AC02_Revert_NonQuantum_OneWei() public {
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.InvalidContributionAmount.selector);
        pool.contribute{value: 1}(pid);
    }

    function test_AC02_Revert_NonQuantum_QuantumMinusOne() public {
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.InvalidContributionAmount.selector);
        pool.contribute{value: QUANTUM - 1}(pid);
    }

    function test_AC02_Revert_NonQuantum_OneUSDCPlusOne() public {
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.InvalidContributionAmount.selector);
        pool.contribute{value: ONE_USDC + 1}(pid);
    }

    // ── excessive deposit revert ──────────────────────────────────────────────

    function test_AC02_Revert_ExceedsRemaining_Full() public {
        // Attempt to contribute more than target
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.ContributionExceedsRemainingCapacity.selector);
        pool.contribute{value: TARGET + ONE_USDC}(pid);
    }

    function test_AC02_Revert_ExceedsRemaining_AfterPartial() public {
        // Contribute 9 USDC, then try to contribute 2 USDC (1 remaining)
        _contribute(pid, alice, 9 * ONE_USDC);
        vm.prank(bob);
        vm.expectRevert(HuiPotGoalPool.ContributionExceedsRemainingCapacity.selector);
        pool.contribute{value: 2 * ONE_USDC}(pid);
    }

    // ── exact remaining amount succeeds ───────────────────────────────────────

    function test_AC02_ExactRemaining_Succeeds() public {
        _contribute(pid, alice, 9 * ONE_USDC);
        // Exactly 1 ONE_USDC remaining
        _contribute(pid, bob, ONE_USDC);
        (,,,,,, uint256 totalContributed,, ) = pool.getPool(pid);
        assertEq(totalContributed, TARGET);
        assertEq(pool.getStatus(pid), STATUS_FUNDED);
    }

    // ── post-goal deposit revert ──────────────────────────────────────────────

    function test_AC02_Revert_PostGoal_PoolFunded() public {
        _fillPool(pid);
        assertEq(pool.getStatus(pid), STATUS_FUNDED);
        vm.prank(bob);
        vm.expectRevert(HuiPotGoalPool.PoolNotActive.selector);
        pool.contribute{value: ONE_USDC}(pid);
    }

    // ── expired deposit revert ────────────────────────────────────────────────

    function test_AC02_Revert_AfterDeadline() public {
        _warpToDeadline(pid);
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.PoolNotActive.selector);
        pool.contribute{value: ONE_USDC}(pid);
    }

    function test_AC02_Revert_PastDeadline() public {
        _warpPastDeadline(pid);
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.PoolNotActive.selector);
        pool.contribute{value: ONE_USDC}(pid);
    }

    // ── contribute emits events ────────────────────────────────────────────────

    function test_AC02_Contributes_EmitsContributed() public {
        uint256 amt = ONE_USDC;
        vm.expectEmit(true, true, false, true, address(pool));
        emit HuiPotGoalPool.Contributed(pid, alice, amt, amt);
        _contribute(pid, alice, amt);
    }

    function test_AC02_Contributes_EmitsContributedWithCumulative() public {
        _contribute(pid, alice, ONE_USDC);
        uint256 amt = 2 * ONE_USDC;
        vm.expectEmit(true, true, false, true, address(pool));
        emit HuiPotGoalPool.Contributed(pid, bob, amt, ONE_USDC + amt);
        _contribute(pid, bob, amt);
    }
}

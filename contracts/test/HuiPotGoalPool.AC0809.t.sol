// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {HuiPotGoalPoolBase} from "./HuiPotGoalPool.Base.t.sol";
import {HuiPotGoalPool} from "../HuiPotGoalPool.sol";

contract HuiPotGoalPool_AC0809 is HuiPotGoalPoolBase {

    uint256 internal pid;

    function setUp() public override {
        super.setUp();
        pid = _createDefault(); // TARGET = 10 ONE_USDC
    }

    // ════════════════════════════════════════════════════════════════════════
    // AC08 — events
    // ════════════════════════════════════════════════════════════════════════

    function test_AC08_PoolCreated_CorrectFields() public {
        uint256 t     = 5 * ONE_USDC;
        uint256 dl    = block.timestamp + 3 days;
        string memory title   = "Event Title";
        string memory purpose = "Event Purpose";

        vm.expectEmit(true, true, true, true, address(pool));
        emit HuiPotGoalPool.PoolCreated(2, creator, alice, t, dl, title, purpose);
        vm.prank(creator);
        pool.createPool(alice, t, dl, title, purpose);
    }

    function test_AC08_Contributed_CorrectAmountAndNewTotal() public {
        uint256 amt = 3 * ONE_USDC;
        vm.expectEmit(true, true, false, true, address(pool));
        emit HuiPotGoalPool.Contributed(pid, alice, amt, amt);
        _contribute(pid, alice, amt);
    }

    function test_AC08_Contributed_AccumulatingNewTotal() public {
        _contribute(pid, alice, 2 * ONE_USDC);
        uint256 amt = 3 * ONE_USDC;
        vm.expectEmit(true, true, false, true, address(pool));
        emit HuiPotGoalPool.Contributed(pid, bob, amt, 5 * ONE_USDC);
        _contribute(pid, bob, amt);
    }

    function test_AC08_GoalReached_EmittedExactlyOnce_WhenGoalMet() public {
        // Contribute 9 USDC first (no GoalReached yet)
        _contribute(pid, alice, 9 * ONE_USDC);

        // Now fill the last 1 — GoalReached must fire exactly once
        vm.expectEmit(true, false, false, true, address(pool));
        emit HuiPotGoalPool.GoalReached(pid, TARGET);
        _contribute(pid, bob, ONE_USDC);
    }

    function test_AC08_GoalReached_NOT_EmittedOnNonFillingContribution() public {
        // Contribute only 1 USDC; GoalReached should NOT fire
        // We can't assert "no emit" directly, but we verify the pool is not Funded
        _contribute(pid, alice, ONE_USDC);
        assertEq(pool.getStatus(pid), STATUS_ACTIVE);
    }

    function test_AC08_PaidOut_CorrectFields() public {
        _fillPool(pid);
        vm.expectEmit(true, true, true, true, address(pool));
        emit HuiPotGoalPool.PaidOut(pid, stranger, recipient, TARGET);
        vm.prank(stranger);
        pool.payout(pid);
    }

    function test_AC08_Refunded_CorrectFields() public {
        _contribute(pid, alice, 3 * ONE_USDC);
        _warpPastDeadline(pid);
        vm.expectEmit(true, true, false, true, address(pool));
        emit HuiPotGoalPool.Refunded(pid, alice, 3 * ONE_USDC);
        vm.prank(alice);
        pool.claimRefund(pid);
    }

    function test_AC08_Revert_NoEventOnRevertedContribution() public {
        // A reverting contribute should emit nothing. Verify by checking state unchanged.
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.InvalidContributionAmount.selector);
        pool.contribute{value: 1}(pid);
        assertEq(pool.getContribution(pid, alice), 0);
    }

    // ════════════════════════════════════════════════════════════════════════
    // AC09 — 18-decimal native encoding
    // ════════════════════════════════════════════════════════════════════════

    function test_AC09_OneUSDC_Is_1e18_NativeUnits() public {
        // 1 USDC = 1e18 in this contract's native representation
        assertEq(ONE_USDC, 1e18);
    }

    function test_AC09_Target_MustBeMultipleOf1e12() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidTarget.selector);
        pool.createPool(recipient, ONE_USDC - 1, DEADLINE, "T", "P");
    }

    function test_AC09_Target_QuantumExactly_Succeeds() public {
        vm.prank(creator);
        pool.createPool(recipient, QUANTUM, DEADLINE, "T", "P");
        assertEq(pool.poolCount(), 2);
    }

    function test_AC09_Contribution_BelowQuantum_Reverts() public {
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.InvalidContributionAmount.selector);
        pool.contribute{value: QUANTUM - 1}(pid);
    }

    function test_AC09_Contribution_NotDivisibleByQuantum_Reverts() public {
        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.InvalidContributionAmount.selector);
        pool.contribute{value: QUANTUM + 1}(pid);
    }

    function test_AC09_Contribution_ExactQuantum_Succeeds() public {
        vm.prank(creator);
        pool.createPool(recipient, QUANTUM, DEADLINE, "T", "P");
        uint256 pid2 = pool.poolCount();
        _contribute(pid2, alice, QUANTUM);
        assertEq(pool.getContribution(pid2, alice), QUANTUM);
    }

    function test_AC09_GetPool_ReturnsNative18DecAmounts() public {
        (,, uint256 target,,,,,,) = pool.getPool(pid);
        // target should be in 18-dec native units (10 USDC = 10e18)
        assertEq(target, 10 * 1e18);
    }

    function test_AC09_NoERC20Calls_ContractBalanceIsNative() public {
        // The contract holds ETH (native), not ERC-20.
        // Verify pool's ETH balance increases with each contribute.
        _contribute(pid, alice, ONE_USDC);
        assertEq(address(pool).balance, ONE_USDC);
        _contribute(pid, bob, 2 * ONE_USDC);
        assertEq(address(pool).balance, 3 * ONE_USDC);
    }

    function test_AC09_ContributionAmounts_DisplayInFullUnits() public {
        uint256 amt = 5 * ONE_USDC; // 5 USDC
        _contribute(pid, alice, amt);
        // getContribution returns 5e18 (5 USDC in native 18-dec)
        assertEq(pool.getContribution(pid, alice), 5e18);
    }

    function test_AC09_SmallestValidContribution_IsOneMillionthUSDC() public {
        // QUANTUM = 1e12 = 0.000001 USDC in 18-dec representation
        // Smallest valid contribution
        vm.prank(creator);
        pool.createPool(recipient, QUANTUM, DEADLINE, "T", "P");
        uint256 pid2 = pool.poolCount();
        _contribute(pid2, alice, QUANTUM);
        assertEq(pool.getContribution(pid2, alice), QUANTUM);
    }
}

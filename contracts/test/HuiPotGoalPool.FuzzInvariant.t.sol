// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {HuiPotGoalPool} from "../HuiPotGoalPool.sol";

// ══════════════════════════════════════════════════════════════════════════════
// Fuzz tests
// ══════════════════════════════════════════════════════════════════════════════

contract HuiPotGoalPool_Fuzz is Test {

    HuiPotGoalPool internal pool;
    uint256 internal constant QUANTUM    = 1e12;
    uint256 internal constant ONE_USDC   = 1e18;
    uint256 internal constant MAX_WINDOW = 30 days;

    address internal creator   = makeAddr("creator");
    address internal recipient = makeAddr("recipient");
    address internal alice     = makeAddr("alice");
    address internal bob       = makeAddr("bob");

    function setUp() public {
        pool = new HuiPotGoalPool();
        vm.deal(alice,   1_000_000 * ONE_USDC);
        vm.deal(bob,     1_000_000 * ONE_USDC);
        vm.deal(creator, 1_000_000 * ONE_USDC);
    }

    /// Any valid quantum target + valid deadline → pool created successfully.
    function testFuzz_CreatePool_ValidParams(uint256 targetMultiple, uint256 deadlineOffset) public {
        targetMultiple  = bound(targetMultiple, 1, 1_000_000);
        uint256 target  = targetMultiple * QUANTUM;
        deadlineOffset  = bound(deadlineOffset, 1, MAX_WINDOW);
        uint256 deadline = block.timestamp + deadlineOffset;

        vm.prank(creator);
        pool.createPool(recipient, target, deadline, "T", "P");
        assertEq(pool.poolCount(), 1);
    }

    /// Fuzz the contribution amount: any valid quantum multiple up to target is accepted.
    function testFuzz_Contribute_ValidQuantumAmount(uint256 contribMultiple) public {
        uint256 target = 1_000 * QUANTUM;
        uint256 deadline = block.timestamp + 1 days;
        vm.prank(creator);
        pool.createPool(recipient, target, deadline, "T", "P");
        uint256 pid = pool.poolCount();

        contribMultiple = bound(contribMultiple, 1, 1_000);
        uint256 amount  = contribMultiple * QUANTUM;

        vm.prank(alice);
        pool.contribute{value: amount}(pid);
        assertEq(pool.getContribution(pid, alice), amount);
    }

    /// Non-quantum amounts always revert.
    function testFuzz_Contribute_NonQuantumReverts(uint256 amount) public {
        uint256 target = 1_000 * QUANTUM;
        uint256 deadline = block.timestamp + 1 days;
        vm.prank(creator);
        pool.createPool(recipient, target, deadline, "T", "P");
        uint256 pid = pool.poolCount();

        // ensure amount is NOT a quantum multiple (and non-zero)
        vm.assume(amount > 0 && amount < target && amount % QUANTUM != 0);

        vm.prank(alice);
        vm.expectRevert(HuiPotGoalPool.InvalidContributionAmount.selector);
        pool.contribute{value: amount}(pid);
    }

    /// After filling a pool to exactly the target, totalContributed == target.
    function testFuzz_FillPool_ExactTarget(uint256 targetMultiple) public {
        targetMultiple = bound(targetMultiple, 1, 10_000);
        uint256 target = targetMultiple * QUANTUM;
        vm.prank(creator);
        pool.createPool(recipient, target, block.timestamp + 1 days, "T", "P");
        uint256 pid = pool.poolCount();

        vm.prank(alice);
        pool.contribute{value: target}(pid);

        (,,,,,, uint256 tc,, ) = pool.getPool(pid);
        assertEq(tc, target);
        assertEq(pool.getStatus(pid), 1); // STATUS_FUNDED
    }

    /// Refund recovers exactly what was deposited (fuzz deposit amount).
    function testFuzz_RefundRecoversFull(uint256 depositMultiple) public {
        uint256 target   = 10_000 * QUANTUM;
        depositMultiple  = bound(depositMultiple, 1, 9_999); // always < target
        uint256 deposit  = depositMultiple * QUANTUM;

        vm.prank(creator);
        pool.createPool(recipient, target, block.timestamp + 1 days, "T", "P");
        uint256 pid = pool.poolCount();

        vm.prank(alice);
        pool.contribute{value: deposit}(pid);

        // warp past deadline
        vm.warp(block.timestamp + 1 days + 1);

        uint256 before = alice.balance;
        vm.prank(alice);
        pool.claimRefund(pid);
        assertEq(alice.balance - before, deposit);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// Invariant handler
// ══════════════════════════════════════════════════════════════════════════════

contract PoolHandler is Test {
    HuiPotGoalPool public pool;

    uint256 internal constant QUANTUM    = 1e12;
    uint256 internal constant ONE_USDC   = 1e18;
    uint256 internal constant MAX_WINDOW = 30 days;

    address internal creator   = makeAddr("h_creator");
    address internal recipient = makeAddr("h_recipient");
    address internal alice     = makeAddr("h_alice");
    address internal bob       = makeAddr("h_bob");

    // ghost accounting
    uint256 public ghostTotalDeposited;
    uint256 public ghostTotalRefunded;
    uint256 public ghostTotalPaid;

    uint256 public pid;

    constructor(HuiPotGoalPool _pool) {
        pool = _pool;
        vm.deal(alice,   1_000_000 * ONE_USDC);
        vm.deal(bob,     1_000_000 * ONE_USDC);
        vm.deal(creator, 1_000_000 * ONE_USDC);

        vm.prank(creator);
        pool.createPool(recipient, 10 * ONE_USDC, block.timestamp + MAX_WINDOW, "T", "P");
        pid = pool.poolCount();
    }

    function contribute(uint256 amountMultiple, bool useAlice) external {
        if (pool.getStatus(pid) != 0) return; // only Active

        (,,,,,, uint256 tc,, ) = pool.getPool(pid);
        (, , uint256 target, , , , , , ) = pool.getPool(pid);
        uint256 remaining = target - tc;
        if (remaining == 0) return;

        uint256 maxMul = remaining / QUANTUM;
        if (maxMul == 0) return;
        amountMultiple = bound(amountMultiple, 1, maxMul);
        uint256 amount = amountMultiple * QUANTUM;

        address sender = useAlice ? alice : bob;

        vm.prank(sender);
        try pool.contribute{value: amount}(pid) {
            ghostTotalDeposited += amount;
        } catch {}
    }

    function payout() external {
        if (pool.getStatus(pid) != 1) return; // only Funded

        uint256 before = recipient.balance;
        try pool.payout(pid) {
            ghostTotalPaid += recipient.balance - before;
        } catch {}
    }

    function claimRefundAlice() external {
        if (pool.getStatus(pid) != 3) return; // only Refunding

        uint256 claimable = pool.getClaimable(pid, alice);
        if (claimable == 0) return;

        uint256 before = alice.balance;
        vm.prank(alice);
        try pool.claimRefund(pid) {
            ghostTotalRefunded += alice.balance - before;
        } catch {}
    }

    function claimRefundBob() external {
        if (pool.getStatus(pid) != 3) return; // only Refunding

        uint256 claimable = pool.getClaimable(pid, bob);
        if (claimable == 0) return;

        uint256 before = bob.balance;
        vm.prank(bob);
        try pool.claimRefund(pid) {
            ghostTotalRefunded += bob.balance - before;
        } catch {}
    }

    function warpForward(uint256 seconds_) external {
        seconds_ = bound(seconds_, 1, 31 days);
        vm.warp(block.timestamp + seconds_);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// Invariant tests
// ══════════════════════════════════════════════════════════════════════════════

contract HuiPotGoalPool_Invariant is Test {
    HuiPotGoalPool internal pool;
    PoolHandler    internal handler;

    function setUp() public {
        pool    = new HuiPotGoalPool();
        handler = new PoolHandler(pool);
        targetContract(address(handler));
    }

    /// Pool's ETH balance equals ghostDeposited − ghostRefunded − ghostPaid
    function invariant_ContractBalance_EqualsLiability() public view {
        uint256 expectedBal = handler.ghostTotalDeposited()
            - handler.ghostTotalRefunded()
            - handler.ghostTotalPaid();
        assertEq(address(pool).balance, expectedBal);
    }

    /// totalRefunded <= totalContributed always
    function invariant_RefundedNeverExceedsContributed() public view {
        uint256 pid = handler.pid();
        (,,,,,, uint256 tc, uint256 tr, ) = pool.getPool(pid);
        assertLe(tr, tc);
    }

    /// ghostTotalPaid is either 0 or exactly TARGET (10 ONE_USDC)
    function invariant_PaidIsZeroOrTarget() public view {
        uint256 pid = handler.pid();
        (, , uint256 target, , , , , , ) = pool.getPool(pid);
        uint256 paid = handler.ghostTotalPaid();
        assertTrue(paid == 0 || paid == target);
    }

    /// payout can happen at most once
    function invariant_PayoutAtMostOnce() public view {
        assertTrue(handler.ghostTotalPaid() <= 10 * 1e18);
    }
}

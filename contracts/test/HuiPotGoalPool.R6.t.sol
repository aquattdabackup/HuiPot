// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {HuiPotGoalPool} from "../HuiPotGoalPool.sol";

// ─────────────────────────────────────────────────────────────────────────────
// Internal mocks (no external imports)
// ─────────────────────────────────────────────────────────────────────────────

/// @dev A receiver that can be toggled: starts rejecting, accepts after toggle().
contract ToggleReceiver {
    bool public accepting;
    function toggle() external { accepting = !accepting; }
    receive() external payable {
        require(accepting, "ToggleReceiver: rejecting");
    }
}

/// @dev A contributor that starts rejecting ETH, accepts after toggle().
contract ToggleContributor {
    bool public accepting;
    HuiPotGoalPool public immutable goalPool;

    constructor(HuiPotGoalPool _pool) payable {
        goalPool = _pool;
    }

    function toggle() external { accepting = !accepting; }

    /// Contribute to a pool on behalf of this contract.
    function contribute(uint256 pid, uint256 amount) external {
        goalPool.contribute{value: amount}(pid);
    }

    /// Attempt to claim refund — will revert if `accepting == false` on receive.
    function claimRefund(uint256 pid) external {
        goalPool.claimRefund(pid);
    }

    receive() external payable {
        require(accepting, "ToggleContributor: rejecting");
    }
}

/// @dev A receiver that always reverts on receive (no toggle).
contract RejectingReceiver {
    receive() external payable { revert("RejectingReceiver: always rejects"); }
}

/// @dev A contributor that always reverts on receive.
contract RejectingContributor {
    HuiPotGoalPool public immutable goalPool;

    constructor(HuiPotGoalPool _pool) payable {
        goalPool = _pool;
    }

    function contribute(uint256 pid, uint256 amount) external {
        goalPool.contribute{value: amount}(pid);
    }

    function claimRefund(uint256 pid) external {
        goalPool.claimRefund(pid);
    }

    receive() external payable { revert("RejectingContributor: always rejects"); }
}

// ─────────────────────────────────────────────────────────────────────────────
// R6a — Multi-pool stateful invariant handler
// ─────────────────────────────────────────────────────────────────────────────

struct PoolGhost {
    uint256 target;
    address recipient;
    uint256 deadline;
    uint256 contributed;   // total contributed across alice+bob for this pool
    uint256 refundedAlice;
    uint256 refundedBob;
    uint256 paidAmount;    // target if paid out, else 0
}

contract PoolInterleaveHandler is Test {
    HuiPotGoalPool public pool;

    uint256 internal constant QUANTUM    = 1e12;
    uint256 internal constant ONE_USDC   = 1e18;
    uint256 internal constant MAX_WINDOW = 30 days;

    // three distinct recipients (plain EOA labels — they accept ETH)
    address internal recip1 = makeAddr("ir_recip1");
    address internal recip2 = makeAddr("ir_recip2");
    address internal recip3 = makeAddr("ir_recip3");
    address internal alice  = makeAddr("ir_alice");
    address internal bob    = makeAddr("ir_bob");
    address internal creator = makeAddr("ir_creator");

    // ghost state per pool id (1..3)
    mapping(uint256 => PoolGhost) public ghosts;
    uint256 public numCreated; // 0..3

    constructor(HuiPotGoalPool _pool) {
        pool = _pool;
        vm.deal(alice,   10_000_000 * ONE_USDC);
        vm.deal(bob,     10_000_000 * ONE_USDC);
        vm.deal(creator, 10_000_000 * ONE_USDC);
    }

    // ── lifecycle helpers ─────────────────────────────────────────────────────

    /// Create the next pool (up to 3).
    function createNextPool() external {
        if (numCreated >= 3) return;
        numCreated++;
        uint256 pid = numCreated;

        // Distinct targets: 5 / 10 / 20 ONE_USDC
        uint256 tgt;
        address rcpt;
        if (pid == 1) { tgt = 5  * ONE_USDC; rcpt = recip1; }
        else if (pid == 2) { tgt = 10 * ONE_USDC; rcpt = recip2; }
        else              { tgt = 20 * ONE_USDC; rcpt = recip3; }

        uint256 dl = block.timestamp + MAX_WINDOW;

        vm.prank(creator);
        try pool.createPool(rcpt, tgt, dl, "T", "P") {
            ghosts[pid].target    = tgt;
            ghosts[pid].recipient = rcpt;
            ghosts[pid].deadline  = dl;
        } catch {}
    }

    /// Contribute `amt` quanta to pool `which` (mod numCreated).
    function contributeToPool(uint8 which, uint128 amt) external {
        if (numCreated == 0) return;
        uint256 pid = (uint256(which) % numCreated) + 1;

        if (pool.getStatus(pid) != 0) return; // only ACTIVE

        (,,,,,, uint256 tc,,) = pool.getPool(pid);
        uint256 tgt = ghosts[pid].target;
        uint256 remaining = tgt - tc;
        if (remaining == 0) return;

        uint256 maxMul = remaining / QUANTUM;
        if (maxMul == 0) return;
        uint256 amtMul = bound(uint256(amt), 1, maxMul);
        uint256 amount = amtMul * QUANTUM;

        // alternate alice/bob based on which
        address sender = (which % 2 == 0) ? alice : bob;

        vm.prank(sender);
        try pool.contribute{value: amount}(pid) {
            ghosts[pid].contributed += amount;
        } catch {}
    }

    /// Payout pool `which`.
    function payoutPool(uint8 which) external {
        if (numCreated == 0) return;
        uint256 pid = (uint256(which) % numCreated) + 1;

        if (pool.getStatus(pid) != 1) return; // only FUNDED
        if (ghosts[pid].paidAmount != 0) return;

        address rcpt = ghosts[pid].recipient;
        uint256 before = rcpt.balance;
        try pool.payout(pid) {
            ghosts[pid].paidAmount = rcpt.balance - before;
        } catch {}
    }

    /// Claim refund for alice on pool `which`.
    function claimRefundAlice(uint8 which) external {
        if (numCreated == 0) return;
        uint256 pid = (uint256(which) % numCreated) + 1;

        if (pool.getStatus(pid) != 3) return; // only REFUNDING
        uint256 claimable = pool.getClaimable(pid, alice);
        if (claimable == 0) return;

        uint256 before = alice.balance;
        vm.prank(alice);
        try pool.claimRefund(pid) {
            ghosts[pid].refundedAlice += alice.balance - before;
        } catch {}
    }

    /// Claim refund for bob on pool `which`.
    function claimRefundBob(uint8 which) external {
        if (numCreated == 0) return;
        uint256 pid = (uint256(which) % numCreated) + 1;

        if (pool.getStatus(pid) != 3) return; // only REFUNDING
        uint256 claimable = pool.getClaimable(pid, bob);
        if (claimable == 0) return;

        uint256 before = bob.balance;
        vm.prank(bob);
        try pool.claimRefund(pid) {
            ghosts[pid].refundedBob += bob.balance - before;
        } catch {}
    }

    /// Warp time forward.
    function warpForward(uint32 delta) external {
        uint256 d = bound(uint256(delta), 1, 32 days);
        vm.warp(block.timestamp + d);
    }

    // ── aggregate helpers for invariant assertions ────────────────────────────

    /// Sum of (contributed - refunded - paid) across all created pools.
    function totalNetLiability() public view returns (uint256 liability) {
        for (uint256 pid = 1; pid <= numCreated; pid++) {
            PoolGhost storage g = ghosts[pid];
            uint256 refunded = g.refundedAlice + g.refundedBob;
            liability += g.contributed - refunded - g.paidAmount;
        }
    }
}

// ── Invariant test contract ───────────────────────────────────────────────────

contract HuiPotGoalPool_R6a_MultiPool_Invariant is Test {
    HuiPotGoalPool       internal pool;
    PoolInterleaveHandler internal handler;

    function setUp() public {
        pool    = new HuiPotGoalPool();
        handler = new PoolInterleaveHandler(pool);
        targetContract(address(handler));
    }

    /// Contract balance >= sum of net liabilities across all pools.
    function invariant_MultiPool_BalanceCoversLiabilities() public view {
        assertGe(address(pool).balance, handler.totalNetLiability());
    }

    /// Each pool's on-chain totals match handler ghost tracking.
    function invariant_MultiPool_NoCrossPoolLeak() public view {
        uint256 n = handler.numCreated();
        for (uint256 pid = 1; pid <= n; pid++) {
            (,,,,,, uint256 tc, uint256 tr, bool po) = pool.getPool(pid);
            (
                uint256 gTarget,
                ,
                ,
                uint256 gContrib,
                uint256 gRefAlice,
                uint256 gRefBob,
                uint256 gPaid
            ) = _readGhost(pid);

            // on-chain totalContributed must equal ghost contributed
            assertEq(tc, gContrib, "tc != ghost.contributed");
            // on-chain totalRefunded must equal ghost refundedAlice + refundedBob
            assertEq(tr, gRefAlice + gRefBob, "tr != ghost.refunded");
            // on-chain paidOut flag must be consistent with ghost paidAmount
            if (po) {
                assertEq(gPaid, gTarget, "paidOut but ghost.paidAmount != target");
            } else {
                assertEq(gPaid, 0, "!paidOut but ghost.paidAmount != 0");
            }
        }
    }

    /// paidAmount is monotone per pool: once set to target it cannot decrease.
    function invariant_MultiPool_PayoutAtMostOnce() public view {
        uint256 n = handler.numCreated();
        for (uint256 pid = 1; pid <= n; pid++) {
            (uint256 gTarget,,, , , , uint256 gPaid) = _readGhost(pid);
            // paidAmount is either 0 or exactly target
            assertTrue(gPaid == 0 || gPaid == gTarget, "paidAmount not 0-or-target");
        }
    }

    function _readGhost(uint256 pid) internal view returns (
        uint256 target, address recipient, uint256 deadline,
        uint256 contributed, uint256 refundedAlice, uint256 refundedBob,
        uint256 paidAmount
    ) {
        // PoolGhost is a public mapping — read field by field via handler getters
        // Since the struct is public the compiler generates a tuple getter.
        return handler.ghosts(pid);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// R6b — Forced surplus: balance exactly equals liabilities; forced ETH bounces
// ─────────────────────────────────────────────────────────────────────────────

contract HuiPotGoalPool_R6b is Test {
    HuiPotGoalPool internal pool;

    uint256 internal constant QUANTUM  = 1e12;
    uint256 internal constant ONE_USDC = 1e18;

    address internal creator   = makeAddr("r6b_creator");
    address internal recipient = makeAddr("r6b_recipient");
    address internal alice     = makeAddr("r6b_alice");
    address internal bob       = makeAddr("r6b_bob");

    function setUp() public {
        pool = new HuiPotGoalPool();
        vm.deal(alice,   1_000 * ONE_USDC);
        vm.deal(bob,     1_000 * ONE_USDC);
        vm.deal(creator, 1_000 * ONE_USDC);
    }

    function test_R6b_ForcedSurplus_BalanceCoversLiabilities() public {
        // Create pool, two contributors
        vm.prank(creator);
        pool.createPool(recipient, 10 * ONE_USDC, block.timestamp + 7 days, "T", "P");
        uint256 pid = pool.poolCount();

        uint256 aliceContrib = 3 * ONE_USDC;
        uint256 bobContrib   = 4 * ONE_USDC;

        vm.prank(alice);
        pool.contribute{value: aliceContrib}(pid);
        vm.prank(bob);
        pool.contribute{value: bobContrib}(pid);

        // Attempt forced ETH send — must revert with DirectNativeTransferNotAllowed
        address attacker = makeAddr("r6b_attacker");
        vm.deal(attacker, 1 ether);
        vm.prank(attacker);
        vm.expectRevert(HuiPotGoalPool.DirectNativeTransferNotAllowed.selector);
        (bool sent,) = address(pool).call{value: 1 ether}("");
        // expectRevert consumed the revert; sent is irrelevant here
        // Suppress unused warning:
        sent;

        // Balance must equal the tracked liabilities exactly
        uint256 expectedBalance = aliceContrib + bobContrib;
        assertEq(address(pool).balance, expectedBalance,
            "balance should equal sum of unrefunded contributions");

        // No extra ETH entered the contract
        assertEq(address(pool).balance, aliceContrib + bobContrib);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// R6c — ToggleReceiver: rejecting then accepting payout
// ─────────────────────────────────────────────────────────────────────────────

contract HuiPotGoalPool_R6c is Test {
    HuiPotGoalPool  internal pool;
    ToggleReceiver  internal togRcvr;

    uint256 internal constant QUANTUM  = 1e12;
    uint256 internal constant ONE_USDC = 1e18;

    uint8 internal constant STATUS_FUNDED = 1;
    uint8 internal constant STATUS_PAID   = 2;

    address internal creator = makeAddr("r6c_creator");
    address internal alice   = makeAddr("r6c_alice");

    uint256 internal TARGET = 10 * ONE_USDC;

    function setUp() public {
        pool     = new HuiPotGoalPool();
        togRcvr  = new ToggleReceiver();
        vm.deal(alice,   1_000 * ONE_USDC);
        vm.deal(creator, 1_000 * ONE_USDC);
    }

    function test_R6c_RejectingThenAccepting_Payout() public {
        // Create pool with ToggleReceiver as recipient
        vm.prank(creator);
        pool.createPool(
            address(togRcvr), TARGET, block.timestamp + 7 days, "T", "P"
        );
        uint256 pid = pool.poolCount();

        // Fund pool to goal
        vm.prank(alice);
        pool.contribute{value: TARGET}(pid);

        assertEq(pool.getStatus(pid), STATUS_FUNDED, "should be FUNDED after full contribution");

        uint256 balBefore = address(pool).balance;

        // First payout attempt — ToggleReceiver is rejecting → must revert
        vm.expectRevert(HuiPotGoalPool.NativeTransferFailed.selector);
        pool.payout(pid);

        // Pool state must be unchanged
        assertEq(pool.getStatus(pid), STATUS_FUNDED, "pool should still be FUNDED after failed payout");
        (,,,,,,,, bool paidOut1) = pool.getPool(pid);
        assertFalse(paidOut1, "paidOut must be false after failed payout");
        assertEq(address(pool).balance, balBefore, "balance must be unchanged after failed payout");

        // Toggle receiver to accept
        togRcvr.toggle();
        assertTrue(togRcvr.accepting(), "receiver should now be accepting");

        // Second payout attempt — must succeed
        vm.expectEmit(true, true, true, true, address(pool));
        emit HuiPotGoalPool.PaidOut(pid, address(this), address(togRcvr), TARGET);
        pool.payout(pid);

        assertEq(pool.getStatus(pid), STATUS_PAID, "pool should be PAID after successful payout");
        (,,,,,,,, bool paidOut2) = pool.getPool(pid);
        assertTrue(paidOut2, "paidOut must be true after successful payout");
        assertEq(address(pool).balance, balBefore - TARGET, "balance should decrease by target");
        assertEq(address(togRcvr).balance, TARGET, "recipient should have received target");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// R6d — ToggleContributor: rejecting then accepting claimRefund
// ─────────────────────────────────────────────────────────────────────────────

contract HuiPotGoalPool_R6d is Test {
    HuiPotGoalPool    internal pool;
    ToggleContributor internal togCtrib;

    uint256 internal constant QUANTUM  = 1e12;
    uint256 internal constant ONE_USDC = 1e18;

    uint8 internal constant STATUS_REFUNDING = 3;

    address internal creator = makeAddr("r6d_creator");
    address internal recip   = makeAddr("r6d_recip");

    uint256 internal TARGET      = 10 * ONE_USDC;
    uint256 internal CONTRIB_AMT = 3 * ONE_USDC;

    function setUp() public {
        pool     = new HuiPotGoalPool();
        // Give togCtrib enough ETH to contribute
        togCtrib = new ToggleContributor{value: 100 * ONE_USDC}(pool);
        vm.deal(creator, 1_000 * ONE_USDC);
    }

    function test_R6d_RejectingThenAccepting_ClaimRefund() public {
        // Create pool, let it expire underfunded
        vm.prank(creator);
        pool.createPool(recip, TARGET, block.timestamp + 1 days, "T", "P");
        uint256 pid = pool.poolCount();

        // ToggleContributor contributes but pool will expire underfunded
        togCtrib.contribute(pid, CONTRIB_AMT);
        assertEq(pool.getContribution(pid, address(togCtrib)), CONTRIB_AMT);

        // Warp past deadline → pool becomes REFUNDING
        vm.warp(block.timestamp + 1 days + 1);
        assertEq(pool.getStatus(pid), STATUS_REFUNDING, "should be REFUNDING after deadline");

        uint256 balBefore = address(pool).balance;
        uint256 claimableBefore = pool.getClaimable(pid, address(togCtrib));
        assertEq(claimableBefore, CONTRIB_AMT, "claimable should equal contribution");

        // ToggleContributor is rejecting — first claimRefund must revert
        vm.expectRevert(HuiPotGoalPool.NativeTransferFailed.selector);
        togCtrib.claimRefund(pid);

        // State must be unchanged
        assertEq(pool.getStatus(pid), STATUS_REFUNDING, "still REFUNDING after failed claim");
        assertEq(pool.getClaimable(pid, address(togCtrib)), claimableBefore,
            "claimable unchanged after failed claim");
        assertEq(address(pool).balance, balBefore, "balance unchanged after failed claim");

        // Toggle to accept
        togCtrib.toggle();
        assertTrue(togCtrib.accepting(), "contributor should now accept ETH");

        // Second claimRefund — must succeed
        vm.expectEmit(true, true, false, true, address(pool));
        emit HuiPotGoalPool.Refunded(pid, address(togCtrib), CONTRIB_AMT);
        togCtrib.claimRefund(pid);

        assertEq(pool.getClaimable(pid, address(togCtrib)), 0,
            "claimable should be 0 after successful refund");
        assertEq(address(pool).balance, balBefore - CONTRIB_AMT,
            "balance should decrease by contribution");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// R6e — Full rollback assertions on failed payout (RejectingReceiver)
// ─────────────────────────────────────────────────────────────────────────────

contract HuiPotGoalPool_R6e is Test {
    HuiPotGoalPool   internal pool;
    RejectingReceiver internal rejectRcvr;

    uint256 internal constant ONE_USDC = 1e18;

    uint8 internal constant STATUS_FUNDED = 1;

    address internal creator = makeAddr("r6e_creator");
    address internal alice   = makeAddr("r6e_alice");

    uint256 internal TARGET = 10 * ONE_USDC;

    function setUp() public {
        pool       = new HuiPotGoalPool();
        rejectRcvr = new RejectingReceiver();
        vm.deal(alice,   1_000 * ONE_USDC);
        vm.deal(creator, 1_000 * ONE_USDC);
    }

    function test_R6e_Rollback_FailedPayout_StateAndAccounting() public {
        // Create pool with RejectingReceiver as recipient
        vm.prank(creator);
        pool.createPool(
            address(rejectRcvr), TARGET, block.timestamp + 7 days, "T", "P"
        );
        uint256 pid = pool.poolCount();

        // Fund pool to goal
        vm.prank(alice);
        pool.contribute{value: TARGET}(pid);
        assertEq(pool.getStatus(pid), STATUS_FUNDED, "must be FUNDED");

        uint256 balBefore = address(pool).balance;

        // First payout attempt — must revert with NativeTransferFailed
        vm.expectRevert(HuiPotGoalPool.NativeTransferFailed.selector);
        pool.payout(pid);

        // Full rollback: paidOut must be false, status FUNDED, balance unchanged
        (,,,,,,,, bool paidOut1) = pool.getPool(pid);
        assertFalse(paidOut1, "paidOut must be false after first failed payout");
        assertEq(pool.getStatus(pid), STATUS_FUNDED, "status must be FUNDED after failed payout");
        assertEq(address(pool).balance, balBefore, "balance must be unchanged after failed payout");

        // Second payout attempt — same idempotent result
        vm.expectRevert(HuiPotGoalPool.NativeTransferFailed.selector);
        pool.payout(pid);

        (,,,,,,,, bool paidOut2) = pool.getPool(pid);
        assertFalse(paidOut2, "paidOut must still be false after second failed payout");
        assertEq(pool.getStatus(pid), STATUS_FUNDED, "status must still be FUNDED after second attempt");
        assertEq(address(pool).balance, balBefore, "balance must still be unchanged");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// R6f — Full rollback assertions on failed claimRefund (RejectingContributor)
// ─────────────────────────────────────────────────────────────────────────────

contract HuiPotGoalPool_R6f is Test {
    HuiPotGoalPool      internal pool;
    RejectingContributor internal rejectCtrib;

    uint256 internal constant ONE_USDC = 1e18;

    uint8 internal constant STATUS_REFUNDING = 3;

    address internal creator = makeAddr("r6f_creator");
    address internal recip   = makeAddr("r6f_recip");

    uint256 internal TARGET      = 10 * ONE_USDC;
    uint256 internal CONTRIB_AMT = 4 * ONE_USDC;

    function setUp() public {
        pool        = new HuiPotGoalPool();
        rejectCtrib = new RejectingContributor{value: 100 * ONE_USDC}(pool);
        vm.deal(creator, 1_000 * ONE_USDC);
    }

    function test_R6f_Rollback_FailedClaimRefund_StateAndAccounting() public {
        // Create pool, let it expire underfunded
        vm.prank(creator);
        pool.createPool(recip, TARGET, block.timestamp + 1 days, "T", "P");
        uint256 pid = pool.poolCount();

        // RejectingContributor contributes
        rejectCtrib.contribute(pid, CONTRIB_AMT);
        assertEq(pool.getContribution(pid, address(rejectCtrib)), CONTRIB_AMT);

        // Warp past deadline
        vm.warp(block.timestamp + 1 days + 1);
        assertEq(pool.getStatus(pid), STATUS_REFUNDING, "should be REFUNDING");

        uint256 balBefore        = address(pool).balance;
        uint256 claimableBefore  = pool.getClaimable(pid, address(rejectCtrib));
        assertEq(claimableBefore, CONTRIB_AMT, "claimable must equal contribution");

        (,,,,,, uint256 tcBefore, uint256 trBefore,) = pool.getPool(pid);

        // Attempt claimRefund — must revert (receiver always rejects)
        vm.expectRevert(HuiPotGoalPool.NativeTransferFailed.selector);
        rejectCtrib.claimRefund(pid);

        // Full rollback assertions
        (,,,,,, uint256 tcAfter, uint256 trAfter,) = pool.getPool(pid);
        assertEq(trAfter, trBefore, "totalRefunded must be unchanged after failed claim");
        assertEq(tcAfter, tcBefore, "totalContributed must be unchanged");
        assertEq(pool.getClaimable(pid, address(rejectCtrib)), claimableBefore,
            "claimable must be unchanged after failed claim");
        assertEq(pool.getStatus(pid), STATUS_REFUNDING,
            "status must still be REFUNDING after failed claim");
        assertEq(address(pool).balance, balBefore,
            "balance must be unchanged after failed claim");
    }
}

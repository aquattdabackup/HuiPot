// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {HuiPotGoalPool} from "../HuiPotGoalPool.sol";

/// @dev Shared constants, actors, helpers. No test functions — only inherited.
abstract contract HuiPotGoalPoolBase is Test {
    // ── contract under test ──────────────────────────────────────────────────
    HuiPotGoalPool internal pool;

    // ── quantum constant mirrors ──────────────────────────────────────────────
    uint256 internal constant QUANTUM        = 1e12;
    uint256 internal constant ONE_USDC       = 1e18;   // 1 USDC in native 18-dec units
    uint256 internal constant MAX_WINDOW     = 30 days;

    // ── status codes (mirror contract) ───────────────────────────────────────
    uint8 internal constant STATUS_ACTIVE    = 0;
    uint8 internal constant STATUS_FUNDED    = 1;
    uint8 internal constant STATUS_PAID      = 2;
    uint8 internal constant STATUS_REFUNDING = 3;
    uint8 internal constant STATUS_CLOSED    = 4;

    // ── actors ────────────────────────────────────────────────────────────────
    address internal creator   = makeAddr("creator");
    address internal recipient = makeAddr("recipient");
    address internal alice     = makeAddr("alice");
    address internal bob       = makeAddr("bob");
    address internal carol     = makeAddr("carol");
    address internal stranger  = makeAddr("stranger");

    // ── typical pool params ───────────────────────────────────────────────────
    uint256 internal TARGET   = 10 * ONE_USDC;    // 10 USDC
    uint256 internal DEADLINE;

    // ── string helpers ────────────────────────────────────────────────────────
    string internal TITLE_80;    // exactly 80 bytes
    string internal TITLE_81;    // exactly 81 bytes
    string internal PURPOSE_280; // exactly 280 bytes
    string internal PURPOSE_281; // exactly 281 bytes

    function setUp() public virtual {
        pool = new HuiPotGoalPool();
        DEADLINE = block.timestamp + 7 days;

        // seed ETH for contributors
        vm.deal(alice,   1000 * ONE_USDC);
        vm.deal(bob,     1000 * ONE_USDC);
        vm.deal(carol,   1000 * ONE_USDC);
        vm.deal(creator, 1000 * ONE_USDC);
        vm.deal(stranger,1000 * ONE_USDC);

        // build boundary strings
        TITLE_80    = _repeat("a", 80);
        TITLE_81    = _repeat("a", 81);
        PURPOSE_280 = _repeat("b", 280);
        PURPOSE_281 = _repeat("b", 281);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /// Create a pool with default params, returns poolId.
    function _createDefault() internal returns (uint256 pid) {
        vm.prank(creator);
        pool.createPool(recipient, TARGET, DEADLINE, "Test pool", "A useful purpose");
        pid = pool.poolCount();
    }

    /// Create a pool specifying target and deadline from msg.sender = creator.
    function _createWith(address _recipient, uint256 _target, uint256 _deadline)
        internal returns (uint256 pid)
    {
        vm.prank(creator);
        pool.createPool(_recipient, _target, _deadline, "Test pool", "A useful purpose");
        pid = pool.poolCount();
    }

    /// Contribute `amount` as `sender`.
    function _contribute(uint256 pid, address sender, uint256 amount) internal {
        vm.prank(sender);
        pool.contribute{value: amount}(pid);
    }

    /// Fill pool to 100 % from alice.
    function _fillPool(uint256 pid) internal {
        (,, uint256 target,,,,uint256 totalContributed,,) = pool.getPool(pid);
        uint256 remaining = target - totalContributed;
        _contribute(pid, alice, remaining);
    }

    /// Warp to exactly at deadline.
    function _warpToDeadline(uint256 pid) internal {
        (,,,uint256 deadline,,,,, ) = pool.getPool(pid);
        vm.warp(deadline);
    }

    /// Warp to just past deadline.
    function _warpPastDeadline(uint256 pid) internal {
        (,,,uint256 deadline,,,,, ) = pool.getPool(pid);
        vm.warp(deadline + 1);
    }

    /// Repeat character `c` for `n` bytes.
    function _repeat(string memory c, uint256 n) internal pure returns (string memory s) {
        bytes memory b = bytes(c);
        bytes memory out = new bytes(n);
        for (uint256 i; i < n; ++i) out[i] = b[0];
        return string(out);
    }
}

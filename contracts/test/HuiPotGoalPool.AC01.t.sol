// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {HuiPotGoalPoolBase} from "./HuiPotGoalPool.Base.t.sol";
import {HuiPotGoalPool} from "../HuiPotGoalPool.sol";

contract HuiPotGoalPool_AC01 is HuiPotGoalPoolBase {

    // ── valid creation ────────────────────────────────────────────────────────

    function test_AC01_ValidCreate_StoresFields() public {
        vm.prank(creator);
        pool.createPool(recipient, TARGET, DEADLINE, "My Title", "My Purpose");
        uint256 pid = pool.poolCount();
        assertEq(pid, 1);

        (address cr, address rc, uint256 t, uint256 dl,
         string memory title, string memory purpose,
         uint256 tc, uint256 tr, bool po) = pool.getPool(pid);

        assertEq(cr,    creator);
        assertEq(rc,    recipient);
        assertEq(t,     TARGET);
        assertEq(dl,    DEADLINE);
        assertEq(title, "My Title");
        assertEq(purpose, "My Purpose");
        assertEq(tc, 0);
        assertEq(tr, 0);
        assertFalse(po);
    }

    function test_AC01_ValidCreate_StatusIsActive() public {
        uint256 pid = _createDefault();
        assertEq(pool.getStatus(pid), STATUS_ACTIVE);
    }

    function test_AC01_ValidCreate_EmitsPoolCreated() public {
        vm.expectEmit(true, true, true, true, address(pool));
        emit HuiPotGoalPool.PoolCreated(1, creator, recipient, TARGET, DEADLINE, "My Title", "My Purpose");
        vm.prank(creator);
        pool.createPool(recipient, TARGET, DEADLINE, "My Title", "My Purpose");
    }

    // ── immutable terms ───────────────────────────────────────────────────────

    function test_AC01_ImmutableTerms_CannotBeChangedExternally() public {
        uint256 pid = _createDefault();
        // create a second pool with different params
        uint256 t2 = 5 * ONE_USDC;
        vm.prank(creator);
        pool.createPool(alice, t2, DEADLINE, "Other", "Other purpose");
        uint256 pid2 = pool.poolCount();

        (,, uint256 target1,,,,,, ) = pool.getPool(pid);
        (,, uint256 target2,,,,,, ) = pool.getPool(pid2);
        assertEq(target1, TARGET);
        assertEq(target2, t2);
    }

    // ── independent IDs ───────────────────────────────────────────────────────

    function test_AC01_IndependentIds_Increment() public {
        uint256 pid1 = _createDefault();
        uint256 pid2 = _createDefault();
        assertEq(pid1, 1);
        assertEq(pid2, 2);
    }

    // ── creator == recipient allowed ──────────────────────────────────────────

    function test_AC01_CreatorEqualsRecipient_Allowed() public {
        vm.prank(creator);
        pool.createPool(creator, TARGET, DEADLINE, "Self", "Self purpose");
        uint256 pid = pool.poolCount();
        (address cr, address rc,,,,,,, ) = pool.getPool(pid);
        assertEq(cr, rc);
    }

    // ── invalid recipient ─────────────────────────────────────────────────────

    function test_AC01_Revert_ZeroRecipient() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidRecipient.selector);
        pool.createPool(address(0), TARGET, DEADLINE, "T", "P");
    }

    function test_AC01_Revert_SelfAsRecipient() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidRecipient.selector);
        pool.createPool(address(pool), TARGET, DEADLINE, "T", "P");
    }

    // ── zero / non-quantum target ─────────────────────────────────────────────

    function test_AC01_Revert_ZeroTarget() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidTarget.selector);
        pool.createPool(recipient, 0, DEADLINE, "T", "P");
    }

    function test_AC01_Revert_NonQuantumTarget_OneWei() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidTarget.selector);
        pool.createPool(recipient, 1, DEADLINE, "T", "P");
    }

    function test_AC01_Revert_NonQuantumTarget_QuantumMinusOne() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidTarget.selector);
        pool.createPool(recipient, QUANTUM - 1, DEADLINE, "T", "P");
    }

    function test_AC01_Valid_QuantumTarget() public {
        vm.prank(creator);
        pool.createPool(recipient, QUANTUM, DEADLINE, "T", "P");
        assertEq(pool.poolCount(), 1);
    }

    function test_AC01_Revert_TargetQuantumPlusOne() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidTarget.selector);
        pool.createPool(recipient, QUANTUM + 1, DEADLINE, "T", "P");
    }

    // ── invalid text byte lengths ─────────────────────────────────────────────

    function test_AC01_Revert_TitleEmpty() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidTitleLength.selector);
        pool.createPool(recipient, TARGET, DEADLINE, "", "P");
    }

    function test_AC01_Valid_TitleExactly80() public {
        vm.prank(creator);
        pool.createPool(recipient, TARGET, DEADLINE, TITLE_80, "P");
        assertEq(pool.poolCount(), 1);
    }

    function test_AC01_Revert_TitleExactly81() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidTitleLength.selector);
        pool.createPool(recipient, TARGET, DEADLINE, TITLE_81, "P");
    }

    function test_AC01_Revert_PurposeEmpty() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidPurposeLength.selector);
        pool.createPool(recipient, TARGET, DEADLINE, "T", "");
    }

    function test_AC01_Valid_PurposeExactly280() public {
        vm.prank(creator);
        pool.createPool(recipient, TARGET, DEADLINE, "T", PURPOSE_280);
        assertEq(pool.poolCount(), 1);
    }

    function test_AC01_Revert_PurposeExactly281() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidPurposeLength.selector);
        pool.createPool(recipient, TARGET, DEADLINE, "T", PURPOSE_281);
    }

    // ── unknown pool IDs ──────────────────────────────────────────────────────

    function test_AC01_Revert_GetPool_IdZero() public {
        vm.expectRevert(HuiPotGoalPool.InvalidPoolId.selector);
        pool.getPool(0);
    }

    function test_AC01_Revert_GetPool_IdTooLarge() public {
        vm.expectRevert(HuiPotGoalPool.InvalidPoolId.selector);
        pool.getPool(999);
    }

    function test_AC01_Revert_GetStatus_IdZero() public {
        vm.expectRevert(HuiPotGoalPool.InvalidPoolId.selector);
        pool.getStatus(0);
    }

    // ── deadline boundaries ───────────────────────────────────────────────────

    function test_AC01_Revert_DeadlineExactlyNow() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidDeadline.selector);
        pool.createPool(recipient, TARGET, block.timestamp, "T", "P");
    }

    function test_AC01_Revert_DeadlinePast() public {
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidDeadline.selector);
        pool.createPool(recipient, TARGET, block.timestamp - 1, "T", "P");
    }

    function test_AC01_Valid_DeadlineExactly30Days() public {
        uint256 dl = block.timestamp + MAX_WINDOW;
        vm.prank(creator);
        pool.createPool(recipient, TARGET, dl, "T", "P");
        assertEq(pool.poolCount(), 1);
    }

    function test_AC01_Revert_Deadline30DaysPlusOne() public {
        uint256 dl = block.timestamp + MAX_WINDOW + 1;
        vm.prank(creator);
        vm.expectRevert(HuiPotGoalPool.InvalidDeadline.selector);
        pool.createPool(recipient, TARGET, dl, "T", "P");
    }

    // ── nonpayable value rejection ────────────────────────────────────────────

    function test_AC01_Revert_NonpayableCreatePool() public {
        // createPool is not payable — sending ETH should revert at EVM level
        vm.deal(address(this), 1 ether);
        (bool ok, ) = address(pool).call{value: 1 ether}(
            abi.encodeWithSignature(
                "createPool(address,uint256,uint256,string,string)",
                recipient, TARGET, DEADLINE, "T", "P"
            )
        );
        assertFalse(ok);
    }
}

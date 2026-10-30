// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * FractalFlowMatrix27 - Binary Matrix MLM & Rewards Smart Contract (Updated)
 * Flattened for EVM Contract Verification (BscScan, Polygonscan, Etherscan)
 * Compiler: v0.8.20, Optimizer: 200 runs, viaIR: true
 */


// File: IERC20.sol
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)



/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// File: SafeERC20.sol
// OpenZeppelin Contracts (last updated v5.5.0) (token/ERC20/utils/SafeERC20.sol)




/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeERC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity `token.transfer(to, value)` call, relaxing the requirement on the return value: the
     * return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransfer(IERC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    /**
     * @dev Imitates a Solidity `token.transferFrom(from, to, value)` call, relaxing the requirement on the return
     * value: the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param from The sender of the tokens
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value,
        bool bubble
    ) private returns (bool success) {
        bytes4 selector = IERC20.transferFrom.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(from, shr(96, not(0))))
            mstore(0x24, and(to, shr(96, not(0))))
            mstore(0x44, value)
            success := call(gas(), token, 0, 0x00, 0x64, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    /**
     * @dev Imitates a Solidity `token.approve(spender, value)` call, relaxing the requirement on the return value:
     * the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param spender The spender of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeApprove(IERC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}

// File: ReentrancyGuard.sol
// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)




/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().value = NOT_ENTERED;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        _nonReentrantBeforeView();
        _reentrancyGuardStorageSlot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        _reentrancyGuardStorageSlot().value = NOT_ENTERED;
    }

    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (StorageSlot.Uint256Slot storage) {
        return StorageSlot.getUint256Slot(REENTRANCY_GUARD_STORAGE);
    }
}

library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly {
            r.slot := slot
        }
    }

    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly {
            r.slot := slot
        }
    }

    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly {
            r.slot := slot
        }
    }

    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly {
            r.slot := slot
        }
    }

    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly {
            r.slot := slot
        }
    }

    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly {
            r.slot := slot
        }
    }

    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly {
            r.slot := slot
        }
    }
}

// File: Ownable.sol
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)




abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

abstract contract Ownable is Context {
    address private _owner;

    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// File: FractalFlowMatrix27.sol
contract FractalFlowMatrix27 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;
    uint8 public constant MAX_RANK = 27;
    uint8 public constant MAX_LEVELS = 15;

    address public allSellWallet;
    address public botWallet;
    address public familyPool;

    mapping(uint8 => uint256) public rankPrice;

    struct MatrixNode {
        uint256 id;
        address owner;
        address directSponsor;
        uint256 parentId;
        uint256 leftChild;
        uint256 rightChild;
        bool isClone;
        bool isExtraId;
    }

    struct UserAccount {
        bool isRegistered;
        address sponsor;
        uint256 sponsorMainNodeId;
        uint8 currentMaxRank;
        mapping(uint8 => uint256) firstNodeId;
        mapping(uint8 => uint256) latestNodeId;
        mapping(uint8 => uint256) upgradeVault;
    }

    mapping(uint8 => mapping(uint256 => MatrixNode)) public rankNodes;
    mapping(uint8 => uint256) public totalNodesInRank;
    mapping(uint8 => mapping(uint256 => uint8)) public sponsorRoundToggle;
    mapping(uint8 => mapping(uint256 => uint256)) public nodeUpgradeVault; // แยกกระปุก Vault อิสระรายโหนด (เงินแยกของใครของมัน)
    mapping(uint8 => mapping(uint256 => uint256)) public nodeOriginMainId; // รหัสหลักต้นสังกัดของแต่ละโหนด (เช่น โคลน #8 -> รหัสหลัก #2, โคลน #24 -> รหัสหลัก #6)
    mapping(uint8 => mapping(uint256 => uint256)) public mainNodeLatestCloneId; // โคลนนิ่งของแต่ละรหัสหลักแยกอิสระ (เช่น #2 -> #8, #6 -> #24)
    mapping(address => UserAccount) private users;

    event UserRegistered(address indexed user, address indexed sponsor, uint256 indexed sponsorNodeId, uint256 mainNodeId);
    event BatchRegistered(address indexed user, uint256 count, uint256 totalCost);
    event NodeCreated(uint8 indexed rank, uint256 indexed nodeId, address indexed owner, address directSponsor, uint256 parentId, bool isLeft, bool isClone, bool isExtraId);
    event RewardDistributed(uint256 indexed fromNodeId, uint256 indexed toNodeId, address indexed recipient, uint8 rank, string rewardType, uint256 amount);
    event RankUpgraded(address indexed user, uint8 fromRank, uint8 toRank, uint256 newNodeId, bool isAutoUpgrade);
    event AutoNewMainIdCreated(address indexed user, uint256 count, uint256 vaultDiff);
    event AutoExtraIdCreated(address indexed user, uint8 indexed rank, uint256 nodeId);

    constructor(
        address _usdt,
        address _allSellWallet,
        address _botWallet,
        address _familyPool,
        address _rootUser,
        uint256 _usdtDecimals
    ) Ownable(msg.sender) {
        require(_usdt != address(0) && _allSellWallet != address(0) && _botWallet != address(0) && _familyPool != address(0) && _rootUser != address(0), "Invalid address");
        usdt = IERC20(_usdt);
        allSellWallet = _allSellWallet;
        botWallet = _botWallet;
        familyPool = _familyPool;

        uint256 unit = 10 ** _usdtDecimals;
        uint16[27] memory prices = [
            5, 10, 20, 30, 40, 50, 60, 70, 80, 90,
            100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
            2000, 3000, 4000, 5000, 6000, 8000, 10000
        ];

        for (uint8 i = 0; i < MAX_RANK; i++) {
            rankPrice[i + 1] = uint256(prices[i]) * unit;
        }

        users[_rootUser].isRegistered = true;
        users[_rootUser].sponsor = address(0); // #1 ไม่มีผู้แนะนำ
        users[_rootUser].sponsorMainNodeId = 0;
        users[_rootUser].currentMaxRank = MAX_RANK;

        for (uint8 r = 1; r <= MAX_RANK; r++) {
            totalNodesInRank[r] = 1;
            rankNodes[r][1] = MatrixNode({
                id: 1,
                owner: _rootUser,
                directSponsor: address(0), // #1 ไม่มีผู้แนะนำ
                parentId: 0,
                leftChild: 0,
                rightChild: 0,
                isClone: false,
                isExtraId: false
            });
            users[_rootUser].firstNodeId[r] = 1;
            users[_rootUser].latestNodeId[r] = 1;
            nodeOriginMainId[r][1] = 1;

            emit NodeCreated(r, 1, _rootUser, address(0), 0, true, false, false);
        }
    }

    function checkValidSponsorId(uint256 _sponsorNodeId)
        public
        view
        returns (bool isValid, string memory reason, address sponsorAddress)
    {
        if (_sponsorNodeId == 0 || _sponsorNodeId > totalNodesInRank[1]) {
            return (false, "Sponsor ID does not exist", address(0));
        }

        MatrixNode storage sponsorNode = rankNodes[1][_sponsorNodeId];

        if (sponsorNode.owner == address(0)) {
            return (false, "Sponsor node has no owner", address(0));
        }

        if (sponsorNode.isClone || sponsorNode.isExtraId) {
            return (false, "Special nodes cannot be used as a sponsor", address(0));
        }

        return (true, "Valid main sponsor ID", sponsorNode.owner);
    }

    function previewPlacement(uint8 _rank, uint256 _sponsorNodeId)
        external
        view
        returns (uint256 targetParentId, bool isLeft, uint8 activeRound)
    {
        (bool isValid, , address sponsorAddr) = checkValidSponsorId(_sponsorNodeId);
        require(isValid, "Invalid sponsor node ID");
        activeRound = sponsorRoundToggle[_rank][_sponsorNodeId];
        (targetParentId, isLeft) = _findPlacementWithRound(_rank, sponsorAddr, _sponsorNodeId, activeRound);
    }

    function previewPlacement(uint8 _rank, address _sponsor)
        external
        view
        returns (uint256 targetParentId, bool isLeft, uint8 activeRound)
    {
        uint256 sponsorNodeId = users[_sponsor].firstNodeId[_rank];
        if (sponsorNodeId == 0) {
            sponsorNodeId = users[_sponsor].latestNodeId[_rank];
        }
        if (sponsorNodeId == 0) {
            sponsorNodeId = 1;
        }
        activeRound = sponsorRoundToggle[_rank][sponsorNodeId];
        (targetParentId, isLeft) = _findPlacementWithRound(_rank, _sponsor, sponsorNodeId, activeRound);
    }

    function getAccumulatedVault(address _user, uint8 _targetRank) public view returns (uint256 totalVault) {
        uint8 startRank = _targetRank >= 5 ? _targetRank - 4 : 1;
        
        for (uint8 r = startRank; r < _targetRank; r++) {
            totalVault += users[_user].upgradeVault[r];
        }
    }

    function _clearVaults(address _user, uint8 _targetRank, uint256 _amountToDeduct) internal {
        uint8 startRank = _targetRank >= 5 ? _targetRank - 4 : 1;
        uint256 remainingDeduct = _amountToDeduct;

        for (uint8 r = startRank; r < _targetRank; r++) {
            if (remainingDeduct == 0) break;
            uint256 vaultBal = users[_user].upgradeVault[r];
            if (vaultBal <= remainingDeduct) {
                remainingDeduct -= vaultBal;
                users[_user].upgradeVault[r] = 0;
            } else {
                users[_user].upgradeVault[r] -= remainingDeduct;
                remainingDeduct = 0;
            }
        }
    }

    function checkAndProcessAutoNewMainId(address _user) public {
        uint256 vault1To4 = 0;
        for (uint8 r = 1; r <= 4 && r <= MAX_RANK; r++) {
            vault1To4 += users[_user].upgradeVault[r];
        }

        // คำนวณยอด Vault 1-4 ที่พร้อมนำไปออกรหัสหลักใหม่ (New Main ID = 5 USDT)
        // กรณีผู้ใช้อยู่แรงค์ >= 5 หรือปลดล็อกแรงค์ถัดไปแล้ว ยอดใน Vault 1-4 ที่พ้นช่วงสะสมอัปเกรดแรงค์ถัดไปจะถูกนำมาสร้าง New Main ID อัตโนมัติ
        // และกรณีผู้ใช้กดเรียก checkAndProcessAutoNewMainId โดยตรง หากมียอดสะสมใน Vault 1-4 >= ราคา Rank 1 (5 USDT) ก็สามารถออก New Main ID ได้ทันที
        uint8 nextRank = users[_user].currentMaxRank < MAX_RANK ? users[_user].currentMaxRank + 1 : MAX_RANK;
        uint256 reservedForNextUpgrade = 0;
        if (nextRank <= 5 && users[_user].firstNodeId[nextRank] == 0) {
            uint8 startR = nextRank > 4 ? nextRank - 4 : 1;
            for (uint8 r = startR; r < nextRank && r <= 4; r++) {
                reservedForNextUpgrade += users[_user].upgradeVault[r];
            }
        }

        uint256 availableForNewMainId = vault1To4 > reservedForNextUpgrade
            ? (vault1To4 - reservedForNextUpgrade)
            : vault1To4;

        uint256 rank1Price = rankPrice[1];
        if (rank1Price > 0 && availableForNewMainId >= rank1Price) {
            uint256 count = availableForNewMainId / rank1Price;
            if (count > 0) {
                uint256 totalDeduct = count * rank1Price;
                _clearVaultsForRange(_user, 1, 4, totalDeduct);
                address sponsor = _user;
                uint256 sponsorNodeId = users[_user].firstNodeId[1];
                if (sponsorNodeId == 0) sponsorNodeId = users[_user].sponsorMainNodeId;
                if (sponsorNodeId == 0) sponsorNodeId = 1;

                for (uint256 i = 0; i < count; i++) {
                    _createAndPlaceAutoNode(1, _user, sponsor, sponsorNodeId, false);
                }

                emit AutoNewMainIdCreated(_user, count, totalDeduct);
            }
        }
    }

    function checkAndProcessAutoExtraId(address _user, uint8 _currentRank) public {
        if (_currentRank < 2 || _currentRank > MAX_RANK) return;

        uint256 vault4ToMax = 0;
        for (uint8 r = 4; r <= MAX_RANK; r++) {
            vault4ToMax += users[_user].upgradeVault[r];
        }

        uint8 nextRank = _currentRank < MAX_RANK ? _currentRank + 1 : MAX_RANK;
        uint256 reservedVault = users[_user].firstNodeId[nextRank] == 0
            ? getAccumulatedVault(_user, nextRank)
            : 0;
        uint256 availableDiff = vault4ToMax > reservedVault ? (vault4ToMax - reservedVault) : vault4ToMax;
        uint256 targetPrice = rankPrice[_currentRank];

        if (targetPrice > 0 && availableDiff >= targetPrice) {
            _clearVaultsForRange(_user, 4, MAX_RANK, targetPrice);
            address sponsor = _user;
            uint256 sponsorNodeId = users[_user].firstNodeId[_currentRank];
            if (sponsorNodeId == 0) sponsorNodeId = users[_user].sponsorMainNodeId;
            if (sponsorNodeId == 0) sponsorNodeId = 1;

            _createAndPlaceAutoNode(_currentRank, _user, sponsor, sponsorNodeId, true);

            emit AutoExtraIdCreated(_user, _currentRank, totalNodesInRank[_currentRank]);
        }
    }

    /// @notice สร้าง Auto Extra ID โดยระบุรหัสหลักต้นสังกัด (_sponsorNodeId) เพื่อให้จับคู่เฉพาะโคลนของรหัสหลักนั้น (originMainId === sponsorNodeId) เท่านั้น
    function checkAndProcessAutoExtraIdForNode(address _user, uint8 _currentRank, uint256 _sponsorNodeId) public {
        if (_currentRank < 2 || _currentRank > MAX_RANK) return;

        uint256 vault4ToMax = 0;
        for (uint8 r = 4; r <= MAX_RANK; r++) {
            vault4ToMax += users[_user].upgradeVault[r];
        }

        uint8 nextRank = _currentRank < MAX_RANK ? _currentRank + 1 : MAX_RANK;
        uint256 reservedVault = users[_user].firstNodeId[nextRank] == 0
            ? getAccumulatedVault(_user, nextRank)
            : 0;
        uint256 availableDiff = vault4ToMax > reservedVault ? (vault4ToMax - reservedVault) : vault4ToMax;
        uint256 targetPrice = rankPrice[_currentRank];

        if (targetPrice > 0 && availableDiff >= targetPrice) {
            _clearVaultsForRange(_user, 4, MAX_RANK, targetPrice);
            uint256 originMainId = nodeOriginMainId[_currentRank][_sponsorNodeId];
            if (originMainId == 0) originMainId = _sponsorNodeId;
            if (originMainId == 0) originMainId = users[_user].firstNodeId[_currentRank];
            if (originMainId == 0) originMainId = 1;

            _createAndPlaceAutoNode(_currentRank, _user, _user, originMainId, true);

            emit AutoExtraIdCreated(_user, _currentRank, totalNodesInRank[_currentRank]);
        }
    }

    /// @notice ตรวจสอบยอด Vault เฉพาะของโหนดนั้นๆ (เงินและ Vault แยกอิสระตาม Node ID)
    function getNodeVault(uint8 _rank, uint256 _nodeId) external view returns (uint256) {
        return nodeUpgradeVault[_rank][_nodeId];
    }

    /// @notice สร้าง Auto New Main ID จากกระปุกสะสม Vault 1-4 ของรหัสหลักนั้นๆ โดยเฉพาะ (เงินแยกของใครของมัน)
    function checkAndProcessAutoNewMainIdForNode(uint256 _mainNodeId) public {
        require(_mainNodeId > 0 && _mainNodeId <= totalNodesInRank[1], "Invalid node ID");
        MatrixNode storage mNode = rankNodes[1][_mainNodeId];
        address nodeOwner = mNode.owner;
        require(nodeOwner != address(0), "Node has no owner");

        uint256 originMainId = nodeOriginMainId[1][_mainNodeId];
        if (originMainId == 0) originMainId = _mainNodeId;

        uint256 vault1To4 = 0;
        for (uint8 r = 1; r <= 4 && r <= MAX_RANK; r++) {
            vault1To4 += nodeUpgradeVault[r][_mainNodeId];
        }

        uint256 rank1Price = rankPrice[1];
        if (rank1Price > 0 && vault1To4 >= rank1Price) {
            uint256 count = vault1To4 / rank1Price;
            if (count > 0) {
                uint256 totalDeduct = count * rank1Price;
                uint256 rem = totalDeduct;
                for (uint8 r = 1; r <= 4; r++) {
                    if (rem == 0) break;
                    uint256 bal = nodeUpgradeVault[r][_mainNodeId];
                    if (bal <= rem) {
                        rem -= bal;
                        nodeUpgradeVault[r][_mainNodeId] = 0;
                    } else {
                        nodeUpgradeVault[r][_mainNodeId] -= rem;
                        rem = 0;
                    }
                }

                for (uint256 i = 0; i < count; i++) {
                    _createAndPlaceAutoNode(1, nodeOwner, nodeOwner, originMainId, false);
                }

                emit AutoNewMainIdCreated(nodeOwner, count, totalDeduct);
            }
        }
    }

    function _clearVaultsForRange(address _user, uint8 _start, uint8 _end, uint256 _amountToDeduct) internal {
        uint256 remaining = _amountToDeduct;
        for (uint8 r = _start; r <= _end; r++) {
            if (remaining == 0) break;
            uint256 bal = users[_user].upgradeVault[r];
            if (bal <= remaining) {
                remaining -= bal;
                users[_user].upgradeVault[r] = 0;
            } else {
                users[_user].upgradeVault[r] -= remaining;
                remaining = 0;
            }
        }
    }

    function registerBatch(
        uint256 _sponsorNodeId,
        uint256 _count,
        uint256[] memory _targetParentIds,
        bool[] memory _isLefts,
        bool[] memory _isClones
    ) external nonReentrant {
        require(_count > 0, "Count must be greater than 0");
        bool useAutoFind = _targetParentIds.length == 0;
        if (!useAutoFind) {
            require(
                _targetParentIds.length == _count &&
                _isLefts.length == _count &&
                _isClones.length == _count,
                "Array lengths mismatch"
            );
        }

        (bool isValid, string memory reason, address sponsorAddr) = checkValidSponsorId(_sponsorNodeId);
        require(isValid, reason);

        uint256 unitPrice = rankPrice[1];
        uint256 totalCost = unitPrice * _count;

        usdt.safeTransferFrom(msg.sender, address(this), totalCost);

        // 1 กระเป๋าสามารถสมัครได้ไม่จำกัด (ตั้งค่าเริ่มต้นเฉพาะการสมัครครั้งแรกของกระเป๋า)
        if (!users[msg.sender].isRegistered) {
            users[msg.sender].isRegistered = true;
            users[msg.sender].sponsor = sponsorAddr;
            users[msg.sender].sponsorMainNodeId = _sponsorNodeId;
            users[msg.sender].currentMaxRank = 1;
        }

        uint256 firstCreatedInBatch = 0;

        for (uint256 i = 0; i < _count; i++) {
            uint256 parentId;
            bool isLeft;
            bool isClone = false;

            if (useAutoFind) {
                (parentId, isLeft) = _findFirstAvailableUnder(1, _sponsorNodeId);
            } else {
                parentId = _targetParentIds[i];
                isLeft = _isLefts[i];
                isClone = _isClones[i];
                if (parentId == 0 || parentId > totalNodesInRank[1]) {
                    (parentId, isLeft) = _findFirstAvailableUnder(1, _sponsorNodeId);
                } else {
                    MatrixNode storage checkParent = rankNodes[1][parentId];
                    if ((isLeft && checkParent.leftChild != 0) || (!isLeft && checkParent.rightChild != 0)) {
                        (parentId, isLeft) = _findFirstAvailableUnder(1, _sponsorNodeId);
                    }
                }
            }

            require(parentId > 0 && parentId <= totalNodesInRank[1], "Invalid parent node ID");
            MatrixNode storage parentNode = rankNodes[1][parentId];
            if (isLeft) {
                require(parentNode.leftChild == 0, "Left slot already occupied");
            } else {
                require(parentNode.rightChild == 0, "Right slot already occupied");
            }

            uint256 newNodeId = ++totalNodesInRank[1];
            if (firstCreatedInBatch == 0) {
                firstCreatedInBatch = newNodeId;
            }

            rankNodes[1][newNodeId] = MatrixNode({
                id: newNodeId,
                owner: msg.sender,
                directSponsor: sponsorAddr,
                parentId: parentId,
                leftChild: 0,
                rightChild: 0,
                isClone: isClone,
                isExtraId: false
            });

            if (isLeft) {
                rankNodes[1][parentId].leftChild = newNodeId;
            } else {
                rankNodes[1][parentId].rightChild = newNodeId;
            }

            if (!isClone) {
                nodeOriginMainId[1][newNodeId] = newNodeId;
                if (users[msg.sender].firstNodeId[1] == 0) {
                    users[msg.sender].firstNodeId[1] = newNodeId;
                }
            }
            users[msg.sender].latestNodeId[1] = newNodeId;

            emit NodeCreated(1, newNodeId, msg.sender, sponsorAddr, parentId, isLeft, isClone, false);

            if (isLeft) {
                _distributeLeftChildRewards(1, newNodeId, parentId, msg.sender);
            } else {
                _triggerRightChildClone(1, parentId, false);
            }
        }

        emit UserRegistered(msg.sender, sponsorAddr, _sponsorNodeId, firstCreatedInBatch);
        emit BatchRegistered(msg.sender, _count, totalCost);
    }

    function register(uint256 _sponsorNodeId) external nonReentrant {
        (bool isValid, string memory reason, address sponsorAddr) = checkValidSponsorId(_sponsorNodeId);
        require(isValid, reason);

        uint256 price = rankPrice[1];
        usdt.safeTransferFrom(msg.sender, address(this), price);

        // 1 กระเป๋าสามารถสมัครได้ไม่จำกัด (ตั้งค่าเริ่มต้นเฉพาะการสมัครครั้งแรกของกระเป๋า)
        if (!users[msg.sender].isRegistered) {
            users[msg.sender].isRegistered = true;
            users[msg.sender].sponsor = sponsorAddr;
            users[msg.sender].sponsorMainNodeId = _sponsorNodeId;
            users[msg.sender].currentMaxRank = 1;
        }

        uint256 newMainNodeId = _createAndPlaceNode(1, msg.sender, sponsorAddr, _sponsorNodeId, false, false);

        emit UserRegistered(msg.sender, sponsorAddr, _sponsorNodeId, newMainNodeId);
    }

    function upgradeRank(uint8 _targetRank) external nonReentrant {
        require(users[msg.sender].isRegistered, "User not registered");
        require(_targetRank > 1 && _targetRank <= MAX_RANK, "Invalid target rank");

        uint8 currentRank = users[msg.sender].currentMaxRank;
        require(_targetRank == currentRank + 1, "Must upgrade rank step-by-step");
        require(users[msg.sender].firstNodeId[_targetRank] == 0, "Target rank already active");

        uint256 targetPrice = rankPrice[_targetRank];
        uint256 savedInVault = getAccumulatedVault(msg.sender, _targetRank);

        if (savedInVault >= targetPrice) {
            _clearVaults(msg.sender, _targetRank, targetPrice);
            uint256 remainder = savedInVault - targetPrice;
            if (remainder > 0) {
                usdt.safeTransfer(msg.sender, remainder);
            }
        } else {
            uint256 amountToPay = targetPrice - savedInVault;
            _clearVaults(msg.sender, _targetRank, savedInVault);
            usdt.safeTransferFrom(msg.sender, address(this), amountToPay);
        }

        users[msg.sender].currentMaxRank = _targetRank;
        address sponsor = users[msg.sender].sponsor;
        if (sponsor == address(0)) sponsor = rankNodes[_targetRank][1].owner;
        uint256 sponsorNodeId = users[msg.sender].sponsorMainNodeId;
        if (sponsorNodeId == 0) sponsorNodeId = users[msg.sender].firstNodeId[_targetRank];

        uint256 newNodeId = _createAndPlaceNode(_targetRank, msg.sender, sponsor, sponsorNodeId, false, false);

        checkAndProcessAutoNewMainId(msg.sender);
        checkAndProcessAutoExtraId(msg.sender, _targetRank);

        emit RankUpgraded(msg.sender, currentRank, _targetRank, newNodeId, false);
    }

    function adminUpgradeRank(address _user, uint8 _targetRank) external onlyOwner nonReentrant {
        require(users[_user].isRegistered, "User not registered");
        require(_targetRank > 1 && _targetRank <= MAX_RANK, "Invalid target rank");

        uint8 currentRank = users[_user].currentMaxRank;
        require(_targetRank == currentRank + 1, "Must upgrade rank step-by-step");
        require(users[_user].firstNodeId[_targetRank] == 0, "Target rank already active");

        users[_user].currentMaxRank = _targetRank;
        address sponsor = users[_user].sponsor;
        if (sponsor == address(0)) sponsor = rankNodes[_targetRank][1].owner;
        uint256 sponsorNodeId = users[_user].sponsorMainNodeId;
        if (sponsorNodeId == 0) sponsorNodeId = users[_user].firstNodeId[_targetRank];

        uint256 newNodeId = _createAndPlaceNode(_targetRank, _user, sponsor, sponsorNodeId, false, false);

        checkAndProcessAutoNewMainId(_user);
        checkAndProcessAutoExtraId(_user, _targetRank);

        emit RankUpgraded(_user, currentRank, _targetRank, newNodeId, false);
    }

    function _createAndPlaceNode(
        uint8 _rank,
        address _owner,
        address _sponsor,
        uint256 _sponsorNodeId,
        bool _isClone,
        bool _isExtraId
    ) internal returns (uint256) {
        uint256 effectiveSponsorNodeId = _sponsorNodeId;
        if (effectiveSponsorNodeId == 0) {
            effectiveSponsorNodeId = users[_sponsor].firstNodeId[_rank];
            if (effectiveSponsorNodeId == 0) {
                effectiveSponsorNodeId = 1;
            }
        }

        uint256 parentId;
        bool isLeft;

        // แยกเงื่อนไขการวางตำแหน่ง:
        // 1) โคลนนิ่ง (_isClone): ใช้ _findClonePlacement
        // 2) New Auto ID / Auto Extra ID (_isExtraId): ใช้ _findAutoIdAndExtraIdPlacement (แยกฟังก์ชันเฉพาะใน _createAndPlaceAutoNode)
        // 3) สมัครปกติ: ใช้ _findPlacementWithRound
        if (_isClone) {
            (parentId, isLeft) = _findClonePlacement(_rank, _sponsor, effectiveSponsorNodeId);
        } else if (_isExtraId) {
            (parentId, isLeft) = _findAutoIdAndExtraIdPlacement(_rank, _sponsor, effectiveSponsorNodeId);
        } else {
            uint8 round = sponsorRoundToggle[_rank][effectiveSponsorNodeId];
            (parentId, isLeft) = _findPlacementWithRound(_rank, _sponsor, effectiveSponsorNodeId, round);
            sponsorRoundToggle[_rank][effectiveSponsorNodeId] = round == 0 ? 1 : 0;
        }

        uint256 newNodeId = ++totalNodesInRank[_rank];
        rankNodes[_rank][newNodeId] = MatrixNode({
            id: newNodeId,
            owner: _owner,
            directSponsor: _sponsor,
            parentId: parentId,
            leftChild: 0,
            rightChild: 0,
            isClone: _isClone,
            isExtraId: _isExtraId
        });

        if (isLeft) {
            rankNodes[_rank][parentId].leftChild = newNodeId;
        } else {
            rankNodes[_rank][parentId].rightChild = newNodeId;
        }

        if (!_isClone && !_isExtraId) {
            nodeOriginMainId[_rank][newNodeId] = newNodeId;
            if (users[_owner].firstNodeId[_rank] == 0) {
                users[_owner].firstNodeId[_rank] = newNodeId;
            }
        } else if (_isClone) {
            uint256 originId = nodeOriginMainId[_rank][effectiveSponsorNodeId];
            if (originId == 0) {
                originId = effectiveSponsorNodeId;
            }
            nodeOriginMainId[_rank][newNodeId] = originId;
            mainNodeLatestCloneId[_rank][originId] = newNodeId;
        } else if (_isExtraId) {
            uint256 originId = nodeOriginMainId[_rank][effectiveSponsorNodeId];
            if (originId == 0) {
                originId = effectiveSponsorNodeId;
            }
            nodeOriginMainId[_rank][newNodeId] = originId;
        }
        if (!_isExtraId) {
            users[_owner].latestNodeId[_rank] = newNodeId;
        }

        emit NodeCreated(_rank, newNodeId, _owner, _sponsor, parentId, isLeft, _isClone, _isExtraId);

        if (isLeft) {
            _distributeLeftChildRewards(_rank, newNodeId, parentId, _owner);
        } else {
            _triggerRightChildClone(_rank, parentId, _isExtraId);
        }

        return newNodeId;
    }

    /// @notice สร้างและวางตำแหน่งสำหรับ New Auto ID (Vault 1-4) และ Auto Extra ID (Vault 4-27) โดยเฉพาะ (แยกออกจากโคลนนิ่ง)
    /// เงื่อนไข: จับคู่โคลนตามรหัสหลักต้นสังกัด (originMainId === sponsorNodeId) เท่านั้น ไม่นับรอบ
    function _createAndPlaceAutoNode(
        uint8 _rank,
        address _owner,
        address _sponsor,
        uint256 _sponsorNodeId,
        bool _isExtraId
    ) internal returns (uint256) {
        uint256 effectiveSponsorNodeId = _sponsorNodeId;
        if (effectiveSponsorNodeId == 0) {
            effectiveSponsorNodeId = users[_sponsor].firstNodeId[_rank];
            if (effectiveSponsorNodeId == 0) {
                effectiveSponsorNodeId = 1;
            }
        }

        // ใช้ฟังก์ชันวางตำแหน่งเฉพาะของ New Auto ID และ Auto Extra ID (แยกจากโคลนนิ่ง)
        (uint256 parentId, bool isLeft) = _findAutoIdAndExtraIdPlacement(_rank, _sponsor, effectiveSponsorNodeId);

        uint256 newNodeId = ++totalNodesInRank[_rank];
        rankNodes[_rank][newNodeId] = MatrixNode({
            id: newNodeId,
            owner: _owner,
            directSponsor: _sponsor,
            parentId: parentId,
            leftChild: 0,
            rightChild: 0,
            isClone: false,
            isExtraId: _isExtraId
        });

        if (isLeft) {
            rankNodes[_rank][parentId].leftChild = newNodeId;
        } else {
            rankNodes[_rank][parentId].rightChild = newNodeId;
        }

        if (!_isExtraId) {
            // New Auto ID เป็นรหัสหลักใหม่ในตัวเอง
            nodeOriginMainId[_rank][newNodeId] = newNodeId;
            if (users[_owner].firstNodeId[_rank] == 0) {
                users[_owner].firstNodeId[_rank] = newNodeId;
            }
            users[_owner].latestNodeId[_rank] = newNodeId;
        } else {
            // Auto Extra ID ผูกตามรหัสหลักต้นสังกัด (originMainId === sponsorNodeId)
            uint256 originId = nodeOriginMainId[_rank][effectiveSponsorNodeId];
            if (originId == 0) {
                originId = effectiveSponsorNodeId;
            }
            nodeOriginMainId[_rank][newNodeId] = originId;
        }

        emit NodeCreated(_rank, newNodeId, _owner, _sponsor, parentId, isLeft, false, _isExtraId);

        if (isLeft) {
            _distributeLeftChildRewards(_rank, newNodeId, parentId, _owner);
        } else {
            _triggerRightChildClone(_rank, parentId, _isExtraId);
        }

        return newNodeId;
    }

    /// @notice เงื่อนไขการวางตำแหน่งสำหรับ New Auto ID และ Auto Extra ID (เขียนแยกออกจากโคลนนิ่ง):
    /// จับคู่โคลนตามรหัสหลักต้นสังกัด (originMainId === sponsorNodeId) เท่านั้น
    /// ขั้นตอนที่ 1: ติดตัวรหัสหลักต้นสังกัด (sponsorNodeId) - ซ้ายว่างลงซ้าย, ขวาว่างลงขวา
    /// ขั้นตอนที่ 2: จับคู่เฉพาะโคลนนิ่งที่มีรหัสหลักต้นสังกัดตรงกัน (nodeOriginMainId == sponsorNodeId เท่านั้น) - ซ้ายว่างลงซ้าย, ขวาว่างลงขวา
    /// ขั้นตอนที่ 3: หากเต็มหมดทั้งรหัสหลักและโคลนในสังกัด ให้ค้นหาช่องว่างแบบ BFS ใต้รหัสหลักต้นสังกัดนั้น
    function _findAutoIdAndExtraIdPlacement(uint8 _rank, address _sponsor, uint256 _sponsorNodeId) internal view returns (uint256 parentId, bool isLeft) {
        uint256 requestedId = _sponsorNodeId;
        if (requestedId == 0) {
            requestedId = users[_sponsor].firstNodeId[_rank];
        }
        if (requestedId == 0) {
            requestedId = 1;
        }

        // รหัสหลักต้นสังกัด (sponsorNodeId ที่แท้จริง)
        uint256 sponsorMainId = nodeOriginMainId[_rank][requestedId];
        if (sponsorMainId == 0) {
            sponsorMainId = requestedId;
        }

        // ขั้นตอนที่ 1: วางติดตัวรหัสหลักต้นสังกัด (sponsorNodeId) ซ้ายก่อน ขวาตาม
        MatrixNode storage mainNode = rankNodes[_rank][sponsorMainId];
        if (mainNode.leftChild == 0) return (sponsorMainId, true);
        if (mainNode.rightChild == 0) return (sponsorMainId, false);

        // ขั้นตอนที่ 2: จับคู่โคลนตามรหัสหลักต้นสังกัด (originMainId === sponsorNodeId) เท่านั้น!
        // ตรวจโคลนล่าสุดของรหัสหลักนี้ก่อน โดยต้องยืนยันว่า nodeOriginMainId == sponsorMainId
        uint256 latestCloneId = mainNodeLatestCloneId[_rank][sponsorMainId];
        if (
            latestCloneId != 0 &&
            latestCloneId != sponsorMainId &&
            rankNodes[_rank][latestCloneId].isClone &&
            nodeOriginMainId[_rank][latestCloneId] == sponsorMainId
        ) {
            MatrixNode storage latestClone = rankNodes[_rank][latestCloneId];
            if (latestClone.leftChild == 0) return (latestCloneId, true);
            if (latestClone.rightChild == 0) return (latestCloneId, false);
        }

        // สแกนหาโคลนนิ่งในผังที่มี originMainId === sponsorMainId เท่านั้น (ไม่ข้ามไปโคลนของรหัสหลักอื่นในกระเป๋าเดียวกัน)
        uint256 total = totalNodesInRank[_rank];
        for (uint256 id = 1; id <= total; id++) {
            MatrixNode storage candidate = rankNodes[_rank][id];
            if (!candidate.isClone) continue;
            if (nodeOriginMainId[_rank][id] == sponsorMainId) {
                if (candidate.leftChild == 0) return (id, true);
                if (candidate.rightChild == 0) return (id, false);
            }
        }

        // ขั้นตอนที่ 3: หากรหัสหลักและโคลนในสังกัด (originMainId === sponsorNodeId) เต็มหมด ให้หาช่องว่าง BFS ใต้ sponsorMainId
        return _findFirstAvailableUnder(_rank, sponsorMainId);
    }

    /// @notice ฟังก์ชันวางตำแหน่งสำหรับโคลนนิ่ง (Clone ID - Rebirth):
    /// ขั้นตอนที่ 1: ติดตัวรหัสหลักต้นสังกัด (originMainId) - ซ้ายว่างลงซ้าย, ขวาว่างลงขวา
    /// ขั้นตอนที่ 2: ติดตัวโคลนของรหัสหลักนั้น (mainNodeLatestCloneId) - ซ้ายโคลนว่างลงซ้ายโคลน, ขวาโคลนว่างลงขวาโคลน
    function _findClonePlacement(uint8 _rank, address _sponsor, uint256 _sponsorNodeId) internal view returns (uint256 parentId, bool isLeft) {
        return _findDirectAndClonePlacement(_rank, _sponsor, _sponsorNodeId);
    }

    /// @notice ฟังก์ชันวางตำแหน่งสำหรับสายงานผู้แนะนำตรง (Direct Sponsor Line - รอบ 1)
    function _findDirectAndClonePlacement(uint8 _rank, address _sponsor, uint256 _sponsorNodeId) internal view returns (uint256 parentId, bool isLeft) {
        uint256 primaryNodeId = _sponsorNodeId;
        if (primaryNodeId == 0) {
            primaryNodeId = users[_sponsor].firstNodeId[_rank];
        }
        if (primaryNodeId == 0) {
            primaryNodeId = 1;
        }

        uint256 originMainId = nodeOriginMainId[_rank][primaryNodeId];
        if (originMainId == 0) {
            originMainId = primaryNodeId;
        }

        // ขั้นตอนที่ 1: ติดตัวผู้แนะนำ (Primary Sponsor Node)
        MatrixNode storage primaryNode = rankNodes[_rank][originMainId];
        if (primaryNode.leftChild == 0) return (originMainId, true);
        if (primaryNode.rightChild == 0) return (originMainId, false);

        // ขั้นตอนที่ 2: ติดตัวโคลนของรหัสหลักนั้นโดยเฉพาะ (ไม่ข้ามไปโคลนของรหัสหลักอื่นในกระเป๋าเดียวกัน)
        uint256 latestCloneId = mainNodeLatestCloneId[_rank][originMainId];
        if (
            latestCloneId != 0 &&
            latestCloneId != originMainId &&
            nodeOriginMainId[_rank][latestCloneId] == originMainId
        ) {
            MatrixNode storage latestNode = rankNodes[_rank][latestCloneId];
            if (latestNode.leftChild == 0) return (latestCloneId, true);
            if (latestNode.rightChild == 0) return (latestCloneId, false);
        }

        // ถ้าเต็มทั้งผู้แนะนำและโคลนของรหัสหลักนั้น ให้ค้นหาช่องว่างที่ตื้นที่สุดใต้รหัสหลักนั้น
        return _findFirstAvailableUnder(_rank, originMainId);
    }

    function _findPlacementWithRound(uint8 _rank, address _sponsor, uint256 _sponsorNodeId, uint8 _round) internal view returns (uint256 parentId, bool isLeft) {

        if (_round == 0) {
            // การวางตำแหน่งรอบ 1: ต่อติดตัวของผู้แนะนำ (Direct Sponsor Line) และโคลนนิ่งของรหัสหลักนั้นเท่านั้น
            return _findDirectAndClonePlacement(_rank, _sponsor, _sponsorNodeId);
        } else {
            // การวางตำแหน่งรอบ 2: ค้นหาแบบ "กว้างนำยาว" (BFS ทีละชั้นแนวระนาบ เริ่มจาก Root Node #1)
            return _findGlobalShallowestAvailable(_rank);
        }
    }

    function _findFirstAvailableUnder(uint8 _rank, uint256 _startNodeId) internal view returns (uint256, bool) {
        uint256[64] memory queue;
        uint256 head = 0;
        uint256 tail = 0;

        queue[tail++] = _startNodeId;

        while (head < tail) {
            uint256 currentId = queue[head++];
            MatrixNode storage node = rankNodes[_rank][currentId];

            if (node.leftChild == 0) return (currentId, true);
            if (node.rightChild == 0) return (currentId, false);

            if (tail < 62) {
                if (node.leftChild != 0) queue[tail++] = node.leftChild;
                if (node.rightChild != 0) queue[tail++] = node.rightChild;
            }
        }
        return (_startNodeId, true);
    }

    function _findGlobalShallowestAvailable(uint8 _rank) internal view returns (uint256, bool) {
        uint256[64] memory queue;
        uint256 head = 0;
        uint256 tail = 0;

        queue[tail++] = 1;

        while (head < tail) {
            uint256 currentId = queue[head++];
            MatrixNode storage node = rankNodes[_rank][currentId];

            if (node.leftChild == 0) return (currentId, true);
            if (node.rightChild == 0) return (currentId, false);

            if (tail < 62) {
                if (node.leftChild != 0) queue[tail++] = node.leftChild;
                if (node.rightChild != 0) queue[tail++] = node.rightChild;
            }
        }
        return (1, true);
    }

    function _distributeLeftChildRewards(
        uint8 _rank,
        uint256 _fromNodeId,
        uint256 _parentId,
        address _nodeOwner
    ) internal {
        uint256 totalAmount = rankPrice[_rank];

        // 1. ค่าแนะนำตรง (DIRECT 30%)
        uint256 directReward = (totalAmount * 30) / 100;
        address sponsor = rankNodes[_rank][_fromNodeId].directSponsor;
        
        // กรณีเฉพาะไอดีโคลนนิ่ง ID 1 เมื่อไปต่อฝั่งซ้ายของใครก็ตาม 30% ค่าแนะนำตรงจะถูกส่งไปที่ familyPool
        bool isId1Clone = rankNodes[_rank][_fromNodeId].isClone && (rankNodes[_rank][_fromNodeId].owner == rankNodes[_rank][1].owner);

        if (isId1Clone || sponsor == address(0)) {
            usdt.safeTransfer(familyPool, directReward);
            emit RewardDistributed(_fromNodeId, 0, familyPool, _rank, "DIRECT_ID1_CLONE_FAMILY_POOL", directReward);
        } else {
            uint256 sponsorNodeId = users[sponsor].firstNodeId[_rank];
            if (sponsorNodeId == 0) {
                sponsorNodeId = users[sponsor].latestNodeId[_rank];
            }
            usdt.safeTransfer(sponsor, directReward);
            emit RewardDistributed(_fromNodeId, sponsorNodeId, sponsor, _rank, "DIRECT", directReward);
        }

        // 2. ค่าชั้น (LEVEL 2% ต่อชั้น สูงสุด 15 ชั้น)
        uint256 levelRewardPerTier = (totalAmount * 2) / 100;
        uint256 currentUplineId = _parentId;
        uint256 unpaidLevelAmount = 0;

        for (uint8 i = 1; i <= MAX_LEVELS; i++) {
            if (currentUplineId != 0) {
                address uplineOwner = rankNodes[_rank][currentUplineId].owner;
                usdt.safeTransfer(uplineOwner, levelRewardPerTier);
                emit RewardDistributed(_fromNodeId, currentUplineId, uplineOwner, _rank, "LEVEL", levelRewardPerTier);
                currentUplineId = rankNodes[_rank][currentUplineId].parentId;
            } else {
                unpaidLevelAmount += levelRewardPerTier;
            }
        }

        // 3. ค่า Vault (UPGRADE VAULT 35%)
        uint256 upgradeAmount = (totalAmount * 35) / 100;
        address parentOwner = rankNodes[_rank][_parentId].owner;

        if (rankNodes[_rank][_fromNodeId].isExtraId || _rank >= MAX_RANK) {
            address recipient = rankNodes[_rank][_fromNodeId].isExtraId ? _nodeOwner : parentOwner;
            usdt.safeTransfer(recipient, upgradeAmount);
            emit RewardDistributed(_fromNodeId, _parentId, recipient, _rank, "VAULT_OVERFLOW", upgradeAmount);
        } else if (users[parentOwner].firstNodeId[_rank + 1] != 0) {
            // หากผู้รับมีโหนดในแรงค์ถัดไปอยู่แล้ว:
            // - แรงค์ 1-4: สะสมเข้า upgradeVault[1..4] และ nodeUpgradeVault เพื่อสร้าง New Main ID อัตโนมัติเมื่อครบ 5 USDT (rankPrice[1])
            // - แรงค์ 5+: สะสมเข้า upgradeVault เพื่อสร้าง Auto Extra ID หรือโอนส่วนเกิน
            users[parentOwner].upgradeVault[_rank] += upgradeAmount;
            uint256 parentOriginMainId = nodeOriginMainId[_rank][_parentId];
            if (parentOriginMainId == 0) parentOriginMainId = _parentId;
            nodeUpgradeVault[_rank][parentOriginMainId] += upgradeAmount;
            emit RewardDistributed(_fromNodeId, _parentId, parentOwner, _rank, "UPGRADE_VAULT", upgradeAmount);
            if (_rank <= 4) {
                checkAndProcessAutoNewMainIdForNode(parentOriginMainId);
            } else {
                checkAndProcessAutoExtraIdForNode(parentOwner, _rank, parentOriginMainId);
            }
        } else {
            users[parentOwner].upgradeVault[_rank] += upgradeAmount;
            uint256 parentOriginMainId = nodeOriginMainId[_rank][_parentId];
            if (parentOriginMainId == 0) parentOriginMainId = _parentId;
            nodeUpgradeVault[_rank][parentOriginMainId] += upgradeAmount;
            emit RewardDistributed(_fromNodeId, _parentId, parentOwner, _rank, "UPGRADE_VAULT", upgradeAmount);
            _checkAndProcessAutoUpgrade(parentOwner, _rank, _parentId);
        }

        // 4. กระเป๋า AllSell (4%)
        uint256 allSellAmount = (totalAmount * 4) / 100;
        usdt.safeTransfer(allSellWallet, allSellAmount);
        emit RewardDistributed(_fromNodeId, 0, allSellWallet, _rank, "ALLSELL", allSellAmount);

        // 5. ส่วนตกหล่นจากชั้น Level ที่ไม่เข้าเกณฑ์ (unpaidLevelAmount) ส่งเข้า Family Pool
        if (unpaidLevelAmount > 0) {
            usdt.safeTransfer(familyPool, unpaidLevelAmount);
            emit RewardDistributed(_fromNodeId, 0, familyPool, _rank, "UNPAID_LEVEL_FAMILY_POOL", unpaidLevelAmount);
        }

        // 6. ค่า Bot (1%)
        uint256 botAmount = (totalAmount * 1) / 100;
        usdt.safeTransfer(botWallet, botAmount);
        emit RewardDistributed(_fromNodeId, 0, botWallet, _rank, "BOT", botAmount);
    }

    function _triggerRightChildClone(uint8 _rank, uint256 _parentId, bool _isExtraId) internal {
        address parentOwner = rankNodes[_rank][_parentId].owner;
        address parentSponsor = rankNodes[_rank][_parentId].directSponsor;

        if (parentSponsor == address(0)) {
            parentSponsor = users[parentOwner].sponsor;
        }
        if (parentSponsor == address(0)) {
            parentSponsor = parentOwner;
        }

        // ใช้โหนดที่เกิดลูกขวา (_parentId) เป็นสายโหนดต้นทางสำหรับวางโคลนนิ่งของรหัสหลักนั้นโดยตรง
        uint256 sponsorNodeId = _parentId;
        if (sponsorNodeId == 0) {
            sponsorNodeId = users[parentOwner].firstNodeId[_rank];
        }

        _createAndPlaceNode(_rank, parentOwner, parentSponsor, sponsorNodeId, true, _isExtraId);
    }

    function _checkAndProcessAutoUpgrade(address _user, uint8 _currentRank, uint256 _triggerNodeId) internal {
        uint8 nextRank = _currentRank + 1;
        if (nextRank > MAX_RANK) return;
        
        uint256 nextPrice = rankPrice[nextRank];
        uint256 currentVault = getAccumulatedVault(_user, nextRank);

        if (currentVault >= nextPrice && users[_user].firstNodeId[nextRank] == 0) {
            uint256 remainder = currentVault - nextPrice;
            _clearVaults(_user, nextRank, nextPrice);

            if (users[_user].currentMaxRank < nextRank) {
                users[_user].currentMaxRank = nextRank;
            }

            address sponsor = users[_user].sponsor;
            if (sponsor == address(0)) sponsor = rankNodes[nextRank][1].owner;
            uint256 sponsorNodeId = users[_user].sponsorMainNodeId;
            if (sponsorNodeId == 0) sponsorNodeId = users[_user].firstNodeId[nextRank];

            uint256 newNodeId = _createAndPlaceNode(nextRank, _user, sponsor, sponsorNodeId, false, false);
            
            checkAndProcessAutoNewMainId(_user);
            checkAndProcessAutoExtraId(_user, nextRank);

            emit RankUpgraded(_user, nextRank - 1, nextRank, newNodeId, true);

            if (remainder > 0) {
                usdt.safeTransfer(_user, remainder);
                emit RewardDistributed(_triggerNodeId, newNodeId, _user, nextRank - 1, "VAULT_OVERFLOW", remainder);
            }
        }
    }

    function emergencyWithdrawToken(address _token, uint256 _amount) external onlyOwner nonReentrant {
        require(_token != address(0), "Invalid token address");
        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        require(balance >= _amount, "Insufficient contract balance");
        
        token.safeTransfer(msg.sender, _amount);
    }

    function emergencyWithdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No native balance");
        
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Transfer failed");
    }

    function setSystemWallets(address _allSell, address _bot, address _familyPool) external onlyOwner {
        require(_allSell != address(0) && _bot != address(0) && _familyPool != address(0), "Invalid address");
        allSellWallet = _allSell;
        botWallet = _bot;
        familyPool = _familyPool;
    }

    function getUserProfile(address _user)
        external
        view
        returns (
            bool isRegistered,
            address sponsor,
            uint256 sponsorMainNodeId,
            uint8 currentMaxRank,
            uint256 mainNodeIdRank1,
            uint256 latestCloneIdRank1
        )
    {
        return (
            users[_user].isRegistered,
            users[_user].sponsor,
            users[_user].sponsorMainNodeId,
            users[_user].currentMaxRank,
            users[_user].firstNodeId[1],
            users[_user].latestNodeId[1]
        );
    }

    function getUserRankInfo(address _user, uint8 _rank)
        external
        view
        returns (
            uint256 firstNodeId,
            uint256 latestNodeId,
            uint256 upgradeVaultBalance,
            uint256 nextRankPrice
        )
    {
        uint256 nextPrice = _rank < MAX_RANK ? rankPrice[_rank + 1] : 0;
        return (
            users[_user].firstNodeId[_rank],
            users[_user].latestNodeId[_rank],
            users[_user].upgradeVault[_rank],
            nextPrice
        );
    }
}

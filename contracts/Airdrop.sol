// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";

import "contracts/libraries/Errors.sol";
import "contracts/libraries/SigCheck.sol";

import "contracts/interfaces/IAirdrop.sol";

contract Airdrop is IAirdrop {
    using SafeERC20 for IERC20;
    using BitMaps for BitMaps.BitMap;

    event TokensClaimed(uint256 id, address recipient);

    // The address of the token to airdrop
    IERC20 public immutable token;

    // The merkle root of the airdrop tree
    bytes32 public immutable root;

    // The set of claims which have already been made
    BitMaps.BitMap private claimed;

    /**
     * Create the airdrop.
     * After doing this, you still must fund it.
     *
     * @param _token The address of the token to airdrop
     * @param _root The merkle root of the airdrop tree
     */
    constructor(IERC20 _token, bytes32 _root) {
        token = _token;
        root = _root;
    }

    /**
     * Check whether a specific recipient / ID / claim has been made already.
     *
     * @param _id The individual recipient ID to check whether is claimed or not.
     */
    function isClaimed(uint256 _id) external view returns (bool) {
        return claimed.get(_id);
    }

    /**
     * Check that the claim is valid and error if it is not.
     *
     * @param _signature A blob which is created by the signer and which is used to validate the intention to claim
     * @param _amount The amount that is to be claimed
     * @param _id The ID of the claim (for flagging the bitmap field)
     * @param _beginTime The time after-which the claim may be made
     * @param _endTime The time before-which the claim must be made (expiration)
     * @param _proof The merkle proof which checks [<signing key>, _amount, _id, _beginTime, _endTime] are in the merkle tree.
     * @return The ETH address to pay out the airdrop to.
     */
    function checkValidClaim(
        bytes memory _signature,
        uint256 _amount,
        uint256 _id,
        uint256 _beginTime,
        uint256 _endTime,
        bytes32[] calldata _proof
    ) public view returns (address) {
        (address _account, bytes20 _signer) = SigCheck.verifySignature(
            _signature,
            root
        );
        if (block.timestamp < _beginTime) revert Errors.NotReadyYet();
        if (block.timestamp > _endTime) revert Errors.Expired();
        if (claimed.get(_id)) revert Errors.AlreadyClaimed();
        bytes32 _leaf = keccak256(
            bytes.concat(
                keccak256(
                    abi.encode(_signer, _amount, _id, _beginTime, _endTime)
                )
            )
        );
        if (!MerkleProof.verify(_proof, root, _leaf))
            revert Errors.InvalidProof();
        return _account;
    }

    /**
     * Claim the tokens from the airdrop.
     *
     * @param _signature A blob which is created by the signer and which is used to validate the intention to claim
     * @param _amount The amount that is to be claimed
     * @param _id The ID of the claim (for flagging the bitmap field)
     * @param _beginTime The time after-which the claim may be made
     * @param _endTime The time before-which the claim must be made (expiration)
     * @param _proof The merkle proof which checks [<signing key>, _amount, _id, _beginTime, _endTime] are in the merkle tree.
     */
    function claimTokens(
        bytes memory _signature,
        uint256 _amount,
        uint256 _id,
        uint256 _beginTime,
        uint256 _endTime,
        bytes32[] calldata _proof
    ) external {
        address _account = checkValidClaim(
            _signature,
            _amount,
            _id,
            _beginTime,
            _endTime,
            _proof
        );
        claimed.set(_id);

        token.safeTransfer(_account, _amount);

        emit TokensClaimed(_id, _account);
    }
}

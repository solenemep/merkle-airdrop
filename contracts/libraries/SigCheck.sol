// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "contracts/libraries/Errors.sol";

library SigCheck {
    /**
     *
     * @param pubkey_x The public key X coordinent
     * @param pubkey_y The public key Y coordinent
     * @return btcAddrHash The bitcoin script hash - this can be decoded from the BTC address
     */
    function computeBitcoinAddrHash(
        bytes32 pubkey_x,
        bytes32 pubkey_y
    ) private pure returns (bytes20) {
        bytes memory compressedPubKey = new bytes(33);
        // Each X-coordinate has 2 possible Y-coordinates that can match, so compressed pubkeys
        // contain a prefix of either 0x02 or 0x03.
        // prefix 0x02 means Y-coordinate is even, 0x03 means it's odd.
        uint8 prefix = uint8(pubkey_y[31]) % 2 == 0 ? 0x02 : 0x03;
        compressedPubKey[0] = bytes1(prefix);
        for (uint8 i = 0; i < 32; i++) {
            compressedPubKey[i + 1] = pubkey_x[i];
        }
        return ripemd160(abi.encodePacked(sha256(compressedPubKey)));
    }

    /**
     * Verify a bitcoin-like signed claim.
     *
     * @param dataWithSignature Bytes produced by the signer, contains an ETH claim address
     * @param airdropId The identity of the specific airdrop (in practice, the merkle root)
     * @return payToAddress  The ETH address which was signed in the claim
     * @return lookupKey  The bitcoin script hash - this can be decoded from the BTC address
     */
    function verifySignature(
        bytes memory dataWithSignature,
        bytes32 airdropId
    ) internal pure returns (address payToAddress, bytes20 lookupKey) {
        // 1. Decode the input
        (
            bytes32 pubkey_x,
            bytes32 pubkey_y,
            address payTo,
            uint256 v,
            bytes32 r,
            bytes32 s
        ) = abi.decode(
                dataWithSignature,
                (bytes32, bytes32, address, uint256, bytes32, bytes32)
            );

        // 2. Generate the signed data (the airdropId must match the signer)
        bytes32 dataHash = keccak256(
            abi.encodePacked(airdropId, pubkey_x, pubkey_y, payTo)
        );

        // 3. Check the signature
        (address recovered, ECDSA.RecoverError error, ) = ECDSA.tryRecover(
            dataHash,
            uint8(v),
            r,
            s
        );
        if (error != ECDSA.RecoverError.NoError) revert Errors.WrongSignature();

        // 4. Verify the provided key matches the recovered address
        bytes32 addrHash = keccak256(abi.encode(pubkey_x, pubkey_y));
        address pubKeyAddr = address(uint160(uint256(addrHash)));
        if (pubKeyAddr != recovered) revert Errors.WrongPublicKey();

        // 5. Compute the bitcoin script hash for this key (BTC uses the compressed form of the key)
        lookupKey = computeBitcoinAddrHash(pubkey_x, pubkey_y);

        // 6. Return the signed payTo eth address and the bitcoin addr hash so we know who is paying
        payToAddress = payTo;
    }
}

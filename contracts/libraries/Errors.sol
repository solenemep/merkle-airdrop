// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

library Errors {
    // SigCheck
    error WrongSignature();
    error WrongPublicKey();

    // AirDrop
    error NotReadyYet();
    error Expired();
    error AlreadyClaimed();
    error InvalidProof();
}

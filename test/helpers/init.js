/*@flow*/
const { ethers } = require('hardhat');
const { getCurrentBlockTimestamp, toWei } = require('./utils');
const { MONTH } = require('./constants');
const { createMerkleTree } = require('./merkletree');
const { airdrop1, airdrop2, airdrop3 } = require('../data/ethsig');
const helpers = require('@nomicfoundation/hardhat-toolbox/network-helpers');

// Mon, 01 Jul 2024, 09:56:59 UTC
// The time of block 16519236 on mainnet.
// Therefore, time dependent tests should function with both forked and offline mode.
const INITIAL_TIMESTAMP = 1719827819;

const init = async () /*:any*/ => {
  const users = await ethers.getSigners();
  const user = users[0].address;

  // Token
  const token = await getTokenContract(user);
  const tokenAddress = await token.getAddress();
  console.log('Token address : ', tokenAddress);

  // AirDrop
  const timestamp1 = INITIAL_TIMESTAMP + 1 * MONTH;
  const timestamp2 = INITIAL_TIMESTAMP + 3 * MONTH;
  const timestamp3 = INITIAL_TIMESTAMP + 6 * MONTH;

  const airdrops = [
    { signer: airdrop1.signer, amount: airdrop1.amount, beginTime: timestamp1, endTime: timestamp2 },
    { signer: airdrop2.signer, amount: airdrop2.amount, beginTime: timestamp2, endTime: timestamp3 },
    { signer: airdrop3.signer, amount: airdrop3.amount, beginTime: timestamp3, endTime: '0xffffffffffffffff' },
  ];

  const tree = await createMerkleTree(airdrops);
  if (tree.root !== '0x5f1071318d4282e4b2c7bc265f7454a6e6795cd3e4c823432d6b5730637c7b46') {
    throw new Error('Merkle root has changed, airdrop signatures will be invalid');
  }
  const root = tree.root;
  const proofs = tree.proofs;
  let airdropTotal = 0n;
  airdrops.forEach((ad) => (airdropTotal += BigInt(ad.amount)));

  const airdrop = await getAirDropContract(tokenAddress, root);
  const airdropAddress = await airdrop.getAddress();
  console.log('Airdrop address : ', airdropAddress);

  // token transfers
  await token.transfer(airdropAddress, airdropTotal);
  console.log(`Airdrop contract received ${await token.balanceOf(airdropAddress)} tokens`);

  return {
    users,
    root,
    proofs,
    timestamp1,
    timestamp2,
    timestamp3,
    token,
    airdrop,
  };
};

const getTokenContract = async (user /*:string*/) => {
  const tokenTotalSupply = toWei('6000000000');

  const token = await ethers.deployContract('Token', ['Token', 'TKN', user, tokenTotalSupply]);
  await token.waitForDeployment();

  return token;
};

const getAirDropContract = async (tokenAddress /*:string*/, root /*:string*/) => {
  const airdrop = await ethers.deployContract('Airdrop', [tokenAddress, root]);
  await airdrop.waitForDeployment();

  return airdrop;
};

module.exports.init = init;

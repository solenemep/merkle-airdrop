const { time } = require('@openzeppelin/test-helpers');
const { takeSnapshot } = require('@nomicfoundation/hardhat-network-helpers');
const { toWei } = web3.utils;

let _snapshot;
async function snapshot() {
  _snapshot = await takeSnapshot();
}
async function restore() {
  await _snapshot.restore();
}

async function getCurrentBlockTimestamp() {
  return (await web3.eth.getBlock('latest')).timestamp;
}

async function increaseTime(duration) {
  await time.increase(duration);
}

async function increaseTimeTo(target) {
  await time.increaseTo(target);
}

function parseClaim(claim) {
  const fields = claim.split(':');
  return Buffer.from(fields[1], 'base64');
}

module.exports = {
  toWei,
  snapshot,
  restore,
  getCurrentBlockTimestamp,
  increaseTime,
  increaseTimeTo,
  parseClaim,
};

const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');

const createMerkleTree = async (airdrops) => {
  let id = 0n;
  const tree = StandardMerkleTree.of(
    airdrops.map((airdrop) => ['0x' + airdrop.signer, airdrop.amount, id++, airdrop.beginTime, airdrop.endTime]),
    ['bytes20', 'uint256', 'uint256', 'uint256', 'uint256']
  );
  const proofs = [];
  for (const [i, v] of tree.entries()) {
    proofs.push(tree.getProof(i));
  }
  return {
    root: tree.root,
    proofs,
  };
};

module.exports.createMerkleTree = createMerkleTree;

const { expect } = require('chai');
const { init } = require('./helpers/init.js');
const {
  snapshot,
  restore,
  toWei,
  increaseTimeTo,
  parseClaim,
  getCurrentBlockTimestamp,
} = require('./helpers/utils.js');
const { MONTH } = require('./helpers/constants.js');
const { airdrop1, airdrop2, airdrop3 } = require('./data/ethsig.js');

describe('Airdrop', async () => {
  let token, tokenAddress;
  let airdrop, airdropAddress;

  let owner;
  let user1, user2, user3, user4;

  let root, proofs;

  let timestamp1, timestamp2, timestamp3;

  const claimAirdrop1 = (connectedContract) => {
    return connectedContract.claimTokens(
      parseClaim(airdrop1.signature),
      airdrop1.amount,
      0,
      timestamp1,
      timestamp2,
      proofs[0]
    );
  };

  before('setup', async () => {
    const setups = await init();

    owner = setups.users[0];
    user1 = setups.users[1];
    user2 = setups.users[2];
    user3 = setups.users[3];
    user4 = setups.users[4];

    root = setups.root;
    proofs = setups.proofs;

    timestamp1 = setups.timestamp1;
    timestamp2 = setups.timestamp2;
    timestamp3 = setups.timestamp3;

    token = setups.token;
    tokenAddress = await token.getAddress();

    airdrop = setups.airdrop;
    airdropAddress = await airdrop.getAddress();

    // setup
    await token.transfer(airdropAddress, toWei('1000'));

    await snapshot();
  });

  afterEach('revert', async () => {
    await restore();
  });

  describe('deployment', async () => {
    it('deploy contract successfully', async () => {
      expect(await airdrop.token()).to.equal(tokenAddress);
      expect(await airdrop.root()).to.equal(root);
    });
  });

  describe('claim', async () => {
    it('pass - Successful checkValidClaim', async () => {
      await increaseTimeTo(timestamp1 + 10);
      await airdrop.checkValidClaim(
        parseClaim(airdrop1.signature),
        airdrop1.amount,
        0,
        timestamp1,
        timestamp2,
        proofs[0]
      );
    });

    it('pass - checkValidClaim too late', async () => {
      await increaseTimeTo(timestamp3);
      await expect(
        airdrop.checkValidClaim(parseClaim(airdrop1.signature), airdrop1.amount, 0, timestamp1, timestamp2, proofs[0])
      ).to.be.revertedWithCustomError(airdrop, 'Expired');
    });

    it('pass - Successful claim', async () => {
      expect(await token.balanceOf(user1.address)).to.equal(0);
      await increaseTimeTo(timestamp1 + 10);
      await claimAirdrop1(airdrop.connect(user1));
      expect(await token.balanceOf(user1.address)).to.equal(30);
    });

    it('fail - Too early', async () => {
      expect(await token.balanceOf(user1.address)).to.equal(0);
      await expect(claimAirdrop1(airdrop.connect(user1))).to.be.revertedWithCustomError(airdrop, 'NotReadyYet');
      expect(await token.balanceOf(user1.address)).to.equal(0);
    });

    it('fail - Too late', async () => {
      expect(await token.balanceOf(user1.address)).to.equal(0);
      await increaseTimeTo(timestamp3);
      await expect(claimAirdrop1(airdrop.connect(user1))).to.be.revertedWithCustomError(airdrop, 'Expired');
      expect(await token.balanceOf(user1.address)).to.equal(0);
    });

    it('fail - Duplicate', async () => {
      expect(await token.balanceOf(user1.address)).to.equal(0);
      await increaseTimeTo(timestamp1 + 10);
      await claimAirdrop1(airdrop.connect(user1));
      expect(await token.balanceOf(user1.address)).to.equal(30);
      await expect(claimAirdrop1(airdrop.connect(user1))).to.be.revertedWithCustomError(airdrop, 'AlreadyClaimed');
      expect(await token.balanceOf(user1.address)).to.equal(30);
    });

    it('fail - Duplicate different sig', async () => {
      expect(await token.balanceOf(user1.address)).to.equal(0);
      await increaseTimeTo(timestamp1 + 10);
      await claimAirdrop1(airdrop.connect(user1));
      expect(await token.balanceOf(user1.address)).to.equal(30);
      await expect(
        airdrop
          .connect(user1)
          .claimTokens(parseClaim(airdrop1.signature), airdrop1.amount, 0, timestamp1, timestamp2, proofs[0])
      ).to.be.revertedWithCustomError(airdrop, 'AlreadyClaimed');
      expect(await token.balanceOf(user1.address)).to.equal(30);
    });

    it('pass - Different user claims', async () => {
      expect(await token.balanceOf(user1.address)).to.equal(0);
      expect(await token.balanceOf(user2.address)).to.equal(0);
      await increaseTimeTo(timestamp1 + 10);
      await claimAirdrop1(airdrop.connect(user2));
      expect(await token.balanceOf(user1.address)).to.equal(30);
      expect(await token.balanceOf(user2.address)).to.equal(0);
    });

    it('pass - Bit is set after claim', async () => {
      expect(await token.balanceOf(user1.address)).to.equal(0);
      expect(await airdrop.isClaimed(0)).to.equal(false);
      await increaseTimeTo(timestamp1 + 10);
      await claimAirdrop1(airdrop.connect(user1));
      expect(await token.balanceOf(user1.address)).to.equal(30);
      expect(await airdrop.isClaimed(0)).to.equal(true);
    });

    it('fail - Wrong ID', async () => {
      expect(await token.balanceOf(user1.address)).to.equal(0);
      await increaseTimeTo(timestamp1 + 10);
      await expect(
        airdrop.connect(user1).claimTokens(
          parseClaim(airdrop1.signature),
          airdrop1.amount,
          1, // wrong id
          timestamp1,
          timestamp2,
          proofs[0]
        )
      ).to.be.revertedWithCustomError(airdrop, 'InvalidProof');
      expect(await token.balanceOf(user1.address)).to.equal(0);
    });

    it('fail - Wrong amount', async () => {
      expect(await token.balanceOf(user1.address)).to.equal(0);
      await increaseTimeTo(timestamp1 + 10);
      await expect(
        airdrop.connect(user1).claimTokens(
          parseClaim(airdrop1.signature),
          '1', // wrong amount
          0,
          timestamp1,
          timestamp2,
          proofs[0]
        )
      ).to.be.revertedWithCustomError(airdrop, 'InvalidProof');
      expect(await token.balanceOf(user1.address)).to.equal(0);
    });

    it('fail - Wrong timestamp1', async () => {
      expect(await token.balanceOf(user1.address)).to.equal(0);
      await increaseTimeTo(timestamp1 + 10);
      await expect(
        airdrop.connect(user1).claimTokens(
          parseClaim(airdrop1.signature),
          airdrop1.amount,
          0,
          123, // wrong timestamp1
          timestamp2,
          proofs[0]
        )
      ).to.be.revertedWithCustomError(airdrop, 'InvalidProof');
      expect(await token.balanceOf(user1.address)).to.equal(0);
    });

    it('fail - Wrong timestamp2', async () => {
      expect(await token.balanceOf(user1.address)).to.equal(0);
      await increaseTimeTo(timestamp1 + 10);
      await expect(
        airdrop.connect(user1).claimTokens(
          parseClaim(airdrop1.signature),
          airdrop1.amount,
          0,
          timestamp1,
          '0xffffffffffffffff', // wrong timestamp2
          proofs[0]
        )
      ).to.be.revertedWithCustomError(airdrop, 'InvalidProof');
      expect(await token.balanceOf(user1.address)).to.equal(0);
    });

    it('fail - Wrong proof', async () => {
      expect(await token.balanceOf(user1.address)).to.equal(0);
      await increaseTimeTo(timestamp1 + 10);
      await expect(
        airdrop.connect(user1).claimTokens(
          parseClaim(airdrop1.signature),
          airdrop1.amount,
          0,
          timestamp1,
          timestamp2,
          proofs[1] // wrong proof
        )
      ).to.be.revertedWithCustomError(airdrop, 'InvalidProof');
      expect(await token.balanceOf(user1.address)).to.equal(0);
    });
  });

  describe('Real Claim', async () => {
    it('works', async () => {
      // This real data uses 1755640800 as the start time
      await increaseTimeTo(1755640800);

      // deploy Airdrop
      const airdrop = await ethers.deployContract('Airdrop', [
        await token.getAddress(),
        '0x430496a40c0da9c168aec9fa3f2f446a0866cf3d2310bffcddb37902e1f99c4e',
      ]);
      await airdrop.waitForDeployment();
      const airdropAddr = await airdrop.getAddress();

      await token.connect(owner).transfer(airdropAddr, await token.balanceOf(owner.address));

      expect(await token.balanceOf('0x81AeF8ee9Ffd22f6C0c6B02c7dAAC84eFD39D838')).to.equal(Math.floor(0));
      await airdrop.connect(user1).claimTokens(
        '0x' +
          Buffer.from(
            'Wpqqn9n0OxJl2zIpOg2KyMrtuQ3IlLFMBHH9nmKDLhbAUgjOO1YWCzHxQcif7Kms' +
              'HF7PH4/8jethZjKGwDh7DgAAAAAAAAAAAAAAAIGu+O6f/SL2wMawLH2qyE79Odg4' +
              'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABzdw3U9hgXA8IQxM1vaMWZc' +
              'a6G4nX8+oX097pgVr+tiPAYnCym6aCXe7C3keFkAK5CZl0nPR1Co7k4YbMR/GDFL',
            'base64'
          ).toString('hex'), // signature
        '1000000000000000000000', // amount
        '87059', // ID
        '1755640800', // start time
        '18446744073709551615', // end time
        [
          '0xe733188de61b1efba39e86f15d39ab5c714122424fb354a53d878a771c2dae6e',
          '0x86f2c106782bb3b6515a21cefb7d6d019e7b09977ec65e0b95cfdef181df5ba8',
          '0xad081e2c519a7cefb9b60e0f8537814445b558ee0f7f4af4d94891c407ff5337',
          '0xdb2f59b858fd8f74b360f061a2af9acedc0089e6828fd0d8f86512d7a1094411',
          '0x00fda405560cf523808cb6fc07ab2ae7bb0b21088a2931b962c0d4ddfab2e099',
          '0xe24851fd968e6a9d36a89b30e7e359a341f1cd0904bda0e82847b987b217431a',
          '0xa553f3f32a09abaf7808f4df9e2e4a633765b24bc6ab21d070a70c6ab98de268',
          '0x328e56690670a113a54b3c9d11e4d49e35bf4801969a7c808dcb71fd6cfaeac1',
          '0xef9b524c10264a4b2c2e42259a17e36a37c607383ac984f57eb499404e23a836',
          '0xca3465064b34ce964427cdbd67c43151f890fbd875706f616d8b14e07aa8ba82',
          '0x42cc235ce58d664b88a9aef8d546198aefe3ab101cd8efad5cbfb742a927966a',
          '0xd77937c4771c2012fad9d4e194f278701962874c8f2a732105670257a6dd3350',
          '0x4139466bf4cf8b4474f00927756e924b50f999f51343f69e6e5906bb4ca539b7',
          '0xaa2874dc0bb797a4d0996f94206da904335bbef61a7ed974ba9c16704d4a5865',
          '0xddc3729c7541fcfa49d04696f7c9d7021b20e6dedb36d6d5235762555e0c69eb',
          '0x822b679beff03b3c2a1eae8f2e2e55c87d3ee96c7a85d0cb1b0a42dfa5838056',
        ]
      );
      expect(await token.balanceOf('0x81AeF8ee9Ffd22f6C0c6B02c7dAAC84eFD39D838')).to.equal('1000000000000000000000');
    });
  });
});

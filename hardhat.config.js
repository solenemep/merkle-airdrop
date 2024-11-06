require('@nomicfoundation/hardhat-toolbox');
require('@nomiclabs/hardhat-web3');

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.28',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: '0.5.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      forking: {
        url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_MAINNET_KEY}`,
        enabled: 'ALCHEMY_MAINNET_KEY' in process.env,
        blockNumber: 16519236,
      }
    },
  },
  etherscan: {
  },
  sourcify: {
    enabled: false,
  },
};

module.exports = {

  networks: {
      develop: {
        port: 7545,
        network_id: "5777",
        host: "127.0.0.1"
    }
  },
  mocha: {
  },
  compilers: {
    solc: {
      version: "0.8.9",
    }
  },
};

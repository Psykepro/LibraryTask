var Library = artifacts.require("./Library.sol");
var StringUtils = artifacts.require("./StringUtils.sol");

module.exports = function(deployer) {
  deployer.deploy(StringUtils);
  deployer.link(StringUtils, [Library])
  deployer.deploy(Library);
};

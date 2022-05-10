const OTC = artifacts.require("OTC")

module.exports = function (deployer, network, accounts) {
    deployer.deploy(OTC, {from : accounts[3]});                                 // Deploy from any address
};

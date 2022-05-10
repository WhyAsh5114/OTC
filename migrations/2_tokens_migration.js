const WETH = artifacts.require("WETH")
const USDC = artifacts.require("USDC")

module.exports = function (deployer, network, accounts) {
    deployer.deploy(WETH, 2000000000000000000n, {from : accounts[0]})               // First Address (A)
    deployer.deploy(USDC, 50000000000000000000n, {from : accounts[1]})              // Second Address (B)
}

const weth = artifacts.require("WETH")
const usdc = artifacts.require("USDC")
const otc = artifacts.require("OTC")

/**
 * Global variables to store contract instances which
 * can be used in every test without having to redeploy
 */
var WETH;
var USDC;
var OTC;


contract("OTC Platform Multiple Accounts Cases Tests", function mainCallback(accounts) {
    var A = accounts[0]
    var B = accounts[1]
    var C = accounts[2]
    // Deploy all contracts before test
    before(async function deployContracts() {
        WETH = await weth.deployed()
        USDC = await usdc.deployed()
        OTC = await otc.deployed()
    })
    it("All contracts should be deployed properly", async function deployCheck() {
        console.log("  - Basic Tests")
        assert(WETH.address !== "" && USDC.address !== "" && OTC.address !== "")                                            // Make sure all contracts get deployed on the blockchain
    })
    it("User accounts should have correct balances (2 WETH for A and 50 USDC for B)", async function transferTokens() {
        var balance_of_account0 = parseInt(await WETH.balanceOf(A)) / 10 ** 18                                              // Get WETH balanceOf A
        var balance_of_account1 = parseInt(await USDC.balanceOf(B)) / 10 ** 18                                              // Get USDC balanceOf B
        assert(balance_of_account0 === 2 && balance_of_account1 === 50)                                                     // Make sure A has 2 WETH and B has 50 USDC
    })
    it("Approve token transfer to OTC Contract", async function approveTokens() {
        await WETH.approve(OTC.address, BigInt(10 * 10 ** 18), { from: A })                                                 // Approve OTC contract to spend 10 WETH
        await USDC.approve(OTC.address, BigInt(125 * 10 ** 18), { from: A })                                                // Approve OTC contract to spend 125 USDC
        await WETH.approve(OTC.address, BigInt(10 * 10 ** 18), { from: B })                                                 // Approvals for secondary tokens of each account
        await USDC.approve(OTC.address, BigInt(125 * 10 ** 18), { from: B })                                                // For further tests
        await WETH.approve(OTC.address, BigInt(125 * 10 ** 18), { from: C })                                                // For further tests
        await USDC.approve(OTC.address, BigInt(125 * 10 ** 18), { from: C })                                                // For further tests
        var WETH_allowance = parseInt(await WETH.allowance(A, OTC.address)) / 10 ** 18                                      // Get allowance of OTC contract for spending WETH of A
        var USDC_allowance = parseInt(await USDC.allowance(B, OTC.address)) / 10 ** 18                                      // Get allowance of OTC contract for spending USDC of B
        assert(WETH_allowance === 10 && USDC_allowance === 125)                                                             // Make sure OTC contract can spend 10 WETH of A and 125 USDC of B
    })
    it("transfer 25 USDC to C", async () => {
        console.log("  - Multiple fills trade test 1")
        await USDC.transfer(C, BigInt(25 * 10 ** 18), { from: B })
        assert(parseInt(await USDC.balanceOf(C)) / 10 ** 18 === 25)
    })
    it("create trade of 2 WETH for 50 USDC from A", async () => {
        await OTC.createTrade(WETH.address, BigInt(2 * 10 ** 18), USDC.address, BigInt(50 * 10 ** 18))
        assert(parseInt(await WETH.balanceOf(A)) / 10 ** 18 === 0)
    })
    it("fill trade from B by 15 USDC", async () => {
        await OTC.fillTrade(0, USDC.address, BigInt(15 * 10 ** 18), { from: B })
        var B_bal = parseInt(await USDC.balanceOf(B)) / 10 ** 18 === 10
        var A_bal = parseInt(await USDC.balanceOf(A)) / 10 ** 18 === 15
        assert(A_bal && B_bal)
    })
    it("fill trade from C by 25 USDC", async () => {
        await OTC.fillTrade(0, USDC.address, BigInt(25 * 10 ** 18), { from: C })
        var C_bal = parseInt(await USDC.balanceOf(C)) / 10 ** 18 === 0
        var A_bal = parseInt(await USDC.balanceOf(A)) / 10 ** 18 === 40
        assert(A_bal && C_bal)
    })
    it("cancel trade from A and get (2-(0.6+1)) WETH back", async () => {
        await OTC.cancelTrade(0)
        var A_WETH = parseInt(await WETH.balanceOf(A)) / 10 ** 18 === 0.4
        var A_USDC = parseInt(await USDC.balanceOf(A)) / 10 ** 18 === 40
        var B_WETH = parseInt(await WETH.balanceOf(B)) / 10 ** 18 === 0.6
        var B_USDC = parseInt(await USDC.balanceOf(B)) / 10 ** 18 === 10
        var C_WETH = parseInt(await WETH.balanceOf(C)) / 10 ** 18 === 1
        var C_USDC = parseInt(await USDC.balanceOf(C)) / 10 ** 18 === 0
        assert(A_WETH && A_USDC && B_WETH && B_USDC && C_WETH && C_USDC)
    })
    it("create trade of 1 WETH for 25 USDC from C", async () => {
        console.log("  - Multiple trade fills test 2")
        await OTC.createTrade(WETH.address, BigInt(1 * 10 ** 18), USDC.address, BigInt(25 * 10 ** 18), { from: C })
        assert(parseInt(await WETH.balanceOf(C)) / 10 ** 18 === 0)
    })
    it("fill trade by 10 USDC from B", async () => {
        await OTC.fillTrade(1, USDC.address, BigInt(10 * 10 ** 18), { from: B })
        assert(parseInt(await USDC.balanceOf(B)) / 10 ** 18 === 0)
    })
    it("fill trade by 15 USDC from A", async () => {
        await OTC.fillTrade(1, USDC.address, BigInt(15 * 10 ** 18))
        assert(parseInt(await WETH.balanceOf(A)) / 10 ** 18 === 1)
    })
    it("confirm balances of all accounts", async () => {
        var A_WETH = parseInt(await WETH.balanceOf(A)) / 10 ** 18 === 1
        var A_USDC = parseInt(await USDC.balanceOf(A)) / 10 ** 18 === 25
        var B_WETH = parseInt(await WETH.balanceOf(B)) / 10 ** 18 === 1
        var B_USDC = parseInt(await USDC.balanceOf(B)) / 10 ** 18 === 0
        var C_WETH = parseInt(await WETH.balanceOf(C)) / 10 ** 18 === 0
        var C_USDC = parseInt(await USDC.balanceOf(C)) / 10 ** 18 === 25
        assert(A_WETH && A_USDC && B_WETH && B_USDC && C_WETH && C_USDC)
    })
    it("create trade of 1 WETH for 25 USDC by B (tradeID 2)", async () => {
        console.log("  - Arbitrage of 2 trades test")
        await OTC.createTrade(WETH.address, BigInt(1 * 10 ** 18), USDC.address, BigInt(25 * 10 ** 18), { from: B })
        assert(parseInt(await WETH.balanceOf(B)) / 10 ** 18 === 0)
    })
    it("create trade of 25 USDC for 0.8 WETH by A (tradeID 3)", async () => {
        await OTC.createTrade(USDC.address, BigInt(25 * 10 ** 18), WETH.address, BigInt(0.8 * 10 ** 18), { from: A })
        assert(parseInt(await USDC.balanceOf(A)) / 10 ** 18 === 0)
    })
    it("fill tradeID 2 fully by C", async () => {
        await OTC.fillTrade(2, USDC.address, BigInt(25 * 10 ** 18), { from: C })
        var C_bal = parseInt(await USDC.balanceOf(C)) / 10 ** 18 === 0
        assert(C_bal)
    })
    it("fill tradeID 3 fully by C", async () => {
        await OTC.fillTrade(3, WETH.address, BigInt(1 * 10 ** 18), { from: C })
        var C_bal = parseInt(await USDC.balanceOf(C)) / 10 ** 18 === 25
        var C_bal2 = parseInt(await WETH.balanceOf(C)) / 10 ** 18 === 0.2                     // Refunded amount
        assert(C_bal && C_bal2)
    })
    it("confirm other balances", async () => {
        var A_WETH = parseInt(await WETH.balanceOf(A)) / 10 ** 18 === 1.8
        var A_USDC = parseInt(await USDC.balanceOf(A)) / 10 ** 18 === 0
        var B_WETH = parseInt(await WETH.balanceOf(B)) / 10 ** 18 === 0
        var B_USDC = parseInt(await USDC.balanceOf(B)) / 10 ** 18 === 25
        var C_WETH = parseInt(await WETH.balanceOf(C)) / 10 ** 18 === 0.2
        var C_USDC = parseInt(await USDC.balanceOf(C)) / 10 ** 18 === 25
        assert(A_WETH && A_USDC && B_WETH && B_USDC && C_WETH && C_USDC)
    })
    it("check that there are no trades available", async () => {
        var totalTrades = await OTC.totalTrades()
        var noTradeAvailable = true;
        for (let i = 0; i < totalTrades; i++) {
            try {
                await OTC.fillTrade(i, USDC.address, BigInt(1*10**18))
            } catch (error) {
                if (error.reason !== "Trade does not exist") {
                    noTradeAvailable = false
                    break
                }
            }
        }
        assert(noTradeAvailable)
    })
})
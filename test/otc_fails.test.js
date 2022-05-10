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


contract("OTC Platform Fail Tests", function mainCallback(accounts) {
    var A = accounts[0]
    var B = accounts[1]
    // Deploy all contracts before test
    before(async function deployContracts() {
        WETH = await weth.deployed()
        USDC = await usdc.deployed()
        OTC = await otc.deployed()
    })
    it("All contracts should be deployed properly", async function deployCheck() {
        console.log("  - Basic Tests")
        assert(WETH.address !== "" && USDC.address !== "" && OTC.address !== "")                        // Make sure all contracts get deployed on the blockchain
    })
    it("User accounts should have correct balances (2 WETH for A and 50 USDC for B)", async function transferTokens() {
        var balance_of_account0 = parseInt(await WETH.balanceOf(A)) / 10 ** 18                          // Get WETH balanceOf A
        var balance_of_account1 = parseInt(await USDC.balanceOf(B)) / 10 ** 18                          // Get USDC balanceOf B
        assert(balance_of_account0 === 2 && balance_of_account1 === 50)                                 // Make sure A has 2 WETH and B has 50 USDC
    })
    it("Approve token transfer to OTC Contract", async function approveTokens() {
        await WETH.approve(OTC.address, BigInt(1 * 10 ** 18), { from: A })                              // Approve OTC contract to spend 1 WETH
        await USDC.approve(OTC.address, BigInt(25 * 10 ** 18), { from: B })                             // Approve OTC contract to spend 25 USDC
        var WETH_allowance = parseInt(await WETH.allowance(A, OTC.address)) / 10 ** 18                  // Get allowance of OTC contract for spending WETH of A
        var USDC_allowance = parseInt(await USDC.allowance(B, OTC.address)) / 10 ** 18                  // Get allowance of OTC contract for spending USDC of B
        assert(WETH_allowance === 1 && USDC_allowance === 25)                                           // Make sure OTC contract can spend 1 WETH of A and 25 USDC of B
    })
    it("Fail when creating trade with 'Insufficient balance' of giveToken", async () => {
        console.log("  - Fail Tests for createTrade()")
        try {
            await OTC.createTrade(WETH.address, BigInt(5*10**18), USDC.address, BigInt(125*10**18))     // Creating trade with 5 WETH when balance is 2, should therefore fail
        } catch (error) {
            assert(error.reason === "Insufficient balance")
        }
    })
    it("Fail when creating trade with 'Insufficient allowance' of giveToken", async () => {
        try {
            await OTC.createTrade(WETH.address, BigInt(2*10**18), USDC.address, BigInt(50*10**18))      // Creating trade with 2 WETH when allowance is 1, should therefore fail
        } catch (error) {
            assert(error.reason === "Insufficient allowance")
        }
    })
    it("Create trade for testing improper fillTrade() calls", async () => {
        console.log("  - Fail Tests for fillTrade()")
        await OTC.createTrade(WETH.address, BigInt(1*10**18), USDC.address, BigInt(25*10**18))          // Create trade for causing fill errors
    })
    it("Fail when filling trade with 'Incorrect token'", async () => {
        try {
            await OTC.fillTrade(0, WETH.address, BigInt(100*10**18), {from: B})                         // Filling trade with WETH token instead of giveToken(USDC), should therefore fail
        } catch (error) {
            assert(error.reason === "Incorrect token")
        }
    })
    it("Fail when filling trade with 'Insufficient balance' of giveToken", async () => {
        try {
            await OTC.fillTrade(0, USDC.address, BigInt(100*10**18), {from: B})                         // Filling trade with 100 USDC when balance is 50, should therefore fail
        } catch (error) {
            assert(error.reason === "Insufficient balance")
        }
    })
    it("Fail when filling trade with 'Insufficent allowance'", async () => {
        try {
            await OTC.fillTrade(0, USDC.address, BigInt(50*10**18), {from: B})                          // Filling trade with 50 USDC when approval limit is 25, should therefore fail
        } catch (error) {
            assert(error.reason === "Insufficient allowance")
        }
    })
    it("Fail at cancelling trade when account is 'Not trade owner'", async () => {
        console.log("  - Fail Tests for cancelTrade()")
        try {
            await OTC.cancelTrade(0, {from: B})                                                         // Cancelling from B when owner is A, should therefore fail
        } catch (error) {
            assert(error.reason === "Not trade owner")
        }
    })
    it("Fail at cancelling trade when 'Trade does not exist' (trade has not been created yet)", async () => {
        try {
            await OTC.cancelTrade(5, {from: B})                                                         // Giving TradeID 5 which hasn't been created, should therefore fail (trade has not been created yet)
        } catch (error) {
            assert(error.reason === "Trade does not exist")
        }
    })
    it("Cancel trade to test cancelling canceled trade, 'Trade does not exist'", async () => {
        await OTC.cancelTrade(0)                                                                        // Cancel trade to test non existing trade cancels
    })
    it("Fail at cancelling trade when 'Trade does not exist' (has already been cancelled)", async () => {
        try {
            await OTC.cancelTrade(0, {from: B})                                                         // Cancelling already cancelled trade, should therefore fail (has already been cancelled)
        } catch (error) {
            assert(error.reason === "Trade does not exist")
        }
    })
    it("Fail when trying to fill a cancelled trade", async () => {
        console.log("  - Fail Test for fillTrade() after cancelTrade()")
        try {
            await OTC.fillTrade(0, USDC.address, BigInt(1*10**18))                                      // Filling a finished (empty) trade, should therefore fail
        } catch (error) {
            assert(error.reason === "Trade does not exist")
        }
    })
})

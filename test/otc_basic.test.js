// Get all contract abstractions
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


contract("OTC Platform Basic Tests", function mainCallback(accounts) {
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
        assert(WETH.address !== "" && USDC.address !== "" && OTC.address !== "")                    // Make sure all contracts get deployed on the blockchain
    })
    it("User accounts should have correct balances (2 WETH for A and 50 USDC for B)", async function transferTokens() {
        var balance_of_account0 = parseInt(await WETH.balanceOf(A)) / 10 ** 18                      // Get WETH balanceOf A
        var balance_of_account1 = parseInt(await USDC.balanceOf(B)) / 10 ** 18                      // Get USDC balanceOf B
        assert(balance_of_account0 === 2 && balance_of_account1 === 50)                             // Make sure A has 2 WETH and B has 50 USDC
    })
    it("Approve token transfer to OTC Contract", async function approveTokens() {
        await WETH.approve(OTC.address, BigInt(1 * 10 ** 18), { from: A })                          // Approve OTC contract to spend 1 WETH
        await USDC.approve(OTC.address, BigInt(25 * 10 ** 18), { from: B })                         // Approve OTC contract to spend 25 USDC
        var WETH_allowance = parseInt(await WETH.allowance(A, OTC.address)) / 10 ** 18              // Get allowance of OTC contract for spending WETH of A
        var USDC_allowance = parseInt(await USDC.allowance(B, OTC.address)) / 10 ** 18              // Get allowance of OTC contract for spending USDC of B
        assert(WETH_allowance === 1 && USDC_allowance === 25)                                       // Make sure OTC contract can spend 1 WETH of A and 25 USDC of B
    })
    it("Create trade of 1 WETH for 25 USDC on OTC Contract from A", async function createTrade() {
        console.log("  - Trade Creation Tests")
        var tradeArguments = [WETH.address, BigInt(1 * 10 ** 18), USDC.address, BigInt(25 * 10 ** 18)]
        await OTC.createTrade(...tradeArguments, { from: A })                                       // Create trade of 1 WETH for 25 USDC from 1st account
        var trade = await OTC.trades((await OTC.totalTrades()) - 1)                                 // Get created trade, same as OTC.trades(0), using totalTrades just for demonstration

        var correctValue = true                                                                     // Temp boolean
        for (key in tradeArguments.keys) {
            if (trade[key] !== tradeArguments[key]) {                                               // If any value doesn't match break and make boolean false
                correctValue = false
                break
            }
        }
        assert(correctValue)                                                                        // Boolean will only be true if all values matched
    })
    it("1 WETH should be transferred from A to OTC Contract", async () => {
        var A_balance = parseInt(await WETH.balanceOf(A)) / 10 ** 18
        var OTC_balance = parseInt(await WETH.balanceOf(OTC.address)) / 10 ** 18                    // Ensure that 1 WETH has been transferred from the creator (A) to contract,
        assert(A_balance === 1, OTC_balance === 1)                                                  // A had 2 WETH, he transferred 1, A balance = 2-1=1
    })
    it("Fill trade[0] by 10 USDC from B", async function fillTrade() {
        console.log("  - Fill Trade Tests")
        await OTC.fillTrade(0, USDC.address, BigInt(10 * 10 ** 18), { from: B })                    // Fill trade with 10 USDC
    })
    it("10 USDC should be transferred from B to A", async () => {
        var B_balance = parseInt(await USDC.balanceOf(B)) / 10 ** 18
        var A_balance = parseInt(await USDC.balanceOf(A)) / 10 ** 18                                // Ensure that 10 USDC has been transferred from the filler (B) to creator (A),
        assert(B_balance === 40 && A_balance === 10)                                                // B had 50 USDC, he transferred 10, B balance = 50-10=40
    })
    it("0.4 WETH should be transferred from OTC Contract to B", async () => {
        var OTC_balance = parseInt(await WETH.balanceOf(OTC.address)) / 10 ** 18
        var B_balance = parseInt(await WETH.balanceOf(B)) / 10 ** 18                                // Ensure that 0.4 WETH (proportionate to fillAmount) has been transferred from the contract to filler(B),
        assert(OTC_balance === 0.6 && B_balance === 0.4)                                            // Contract had 1 WETH, it transferred 0.4, contract balance = 1-0.4=0.6
    })
    it("Should cancel trades[0] when trade is filled", async () => {
        console.log("  - Cancel Trade Tests")
        await OTC.fillTrade(0, USDC.address, BigInt(15*10**18), {from: B})                          // Fill trade fully, to trigger the if when remainingWantBalance reaches 0, which will delete the trade
        try {
            await OTC.fillTrade(0, USDC.address, 1, {from: B})                                      // Try filling the trade, which has been deleted (reset), should therefore fail
        } catch (error) {
            assert(error.reason === "Trade does not exist")
        }
    })
    it("Create sample trade for refund test after cancellation of 25 USDC for 1 WETH", async () => {
        await USDC.approve(OTC.address, BigInt(25*10**18))                                          // Approve 25 USDC in A to createTrade
        await OTC.createTrade(USDC.address, BigInt(25*10**18), WETH.address, BigInt(1*10**18))      // Create trade of 25 USDC for 1 WETH
        var A_balance = parseInt(await USDC.balanceOf(A)) / 10**18                                  // Make sure giveAmount transferred from creator to contract
        assert(A_balance === 0)
    })
    it("Should cancel new trade when sent from owner (A) and get refund of 25 USDC", async () => {
        await OTC.cancelTrade(1, {from : A})                                                        // Trade ID 1, because this is the 2nd trade created in this test run
        var A_balance = parseInt(await USDC.balanceOf(A)) / 10**18
        assert(A_balance === 25)
    })
})

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


contract("OTC Platform Edge Cases Tests", function mainCallback(accounts) {
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
        assert(WETH.address !== "" && USDC.address !== "" && OTC.address !== "")                                            // Make sure all contracts get deployed on the blockchain
    })
    it("User accounts should have correct balances (2 WETH for A and 50 USDC for B)", async function transferTokens() {
        var balance_of_account0 = parseInt(await WETH.balanceOf(A)) / 10 ** 18                                              // Get WETH balanceOf A
        var balance_of_account1 = parseInt(await USDC.balanceOf(B)) / 10 ** 18                                              // Get USDC balanceOf B
        assert(balance_of_account0 === 2 && balance_of_account1 === 50)                                                     // Make sure A has 2 WETH and B has 50 USDC
    })
    it("Approve token transfer to OTC Contract", async function approveTokens() {
        await WETH.approve(OTC.address, BigInt(10 * 10 ** 18), { from: A })                                                 // Approve OTC contract to spend 10 WETH
        await USDC.approve(OTC.address, BigInt(125 * 10 ** 18), { from: B })                                                // Approve OTC contract to spend 125 USDC
        await WETH.approve(OTC.address, BigInt(10 * 10 ** 18), { from: B })                                                 // Approvals for secondary tokens of each account
        await USDC.approve(OTC.address, BigInt(125 * 10 ** 18), { from: A })                                                // For further tests
        var WETH_allowance = parseInt(await WETH.allowance(A, OTC.address)) / 10 ** 18                                      // Get allowance of OTC contract for spending WETH of A
        var USDC_allowance = parseInt(await USDC.allowance(B, OTC.address)) / 10 ** 18                                      // Get allowance of OTC contract for spending USDC of B
        assert(WETH_allowance === 10 && USDC_allowance === 125)                                                             // Make sure OTC contract can spend 10 WETH of A and 125 USDC of B
    })
    it("Create trade for same tokens for same amount", async () => {
        console.log("  - Same Token, Same Amount, Same Owner")
        await OTC.createTrade(WETH.address, BigInt(1 * 10 ** 18), WETH.address, BigInt(1 * 10 ** 18))                       // Create trade of 1 WETH for 1 WETH
        assert(parseInt(await WETH.balanceOf(A)) / 10**18 === 1)                                                            // Both contract and A have 1 WETH after creating trade
    })
    it("Fill trade from owner (A) himself", async () => {
        await OTC.fillTrade(0, WETH.address, BigInt(1 * 10 ** 18))
    })
    it("Confirm owner gets back all tokens when trading Same Token, Same Amount, Same Owner", async () => {
        assert(parseInt(await WETH.balanceOf(A)) / 10 ** 18 === 2)                                                          // A gets back all his WETH after filling trade fully
    })
    it("Create trade for same tokens for different amount", async () => {
        console.log("  - Same Token, Different Amount, Same Owner")
        await OTC.createTrade(USDC.address, BigInt(1 * 10 ** 18), USDC.address, BigInt(2 * 10 ** 18), { from: B })          // Create trade of 1 USDC for 2 USDC (absolute loss, only for testing) from B
        assert(parseInt(await USDC.balanceOf(B)) / 10 ** 18 === 49)                                                         // Ensure 1 USDC transferred from B to Contract (50-1=49)
    })
    it("Fill trade from same account (B)", async () => {
        await OTC.fillTrade(1, USDC.address, BigInt(2 * 10 ** 18), {from: B})                                               // Send 2 USDC as filler to contract
    })
    it("Confirm owner gets back all tokens when trading Same Token, Different Amount, Same Owner", async () => {
        assert(parseInt(await USDC.balanceOf(B)) / 10 ** 18 === 50)                                                         // B gets back all his USDC after filling trade fully
    })
    it("Create trade for testing excess fillAmount", async () => {
        console.log("  - Testing Excess fillAmount")
        await OTC.createTrade(WETH.address, BigInt(1*10**18), USDC.address, BigInt(25*10**18))                              // Create trade of 1 WETH for 25 USDC
        assert(parseInt(await WETH.balanceOf(A)) / 10**18 === 1)                                                            // Confirm balance decrease in A
    })
    it("Fill trade with extra USDC (30 instead of 25)", async () => {
        await OTC.fillTrade(2, USDC.address, BigInt(30*10**18), {from: B})                                                  // Fill trade with excess 5 USDC amount
    })
    it("Confirm appropriate balances after tesing excess fillAmount", async () => {
        var fillerBalance = parseInt(await USDC.balanceOf(B))/10**18 === 25                                                 // Ensure filler gets 5 USDC back (50[startBal]-30[fillAmt]+5[unused]=25)
        var ownerBalance = parseInt(await USDC.balanceOf(A))/10**18 === 25                                                  // Ensure owner gets 25 USDC from trade
        var fillerWETHbalance = parseInt(await WETH.balanceOf(B))/10**18 === 1                                              // Ensure filler gets 1 WETH for his 25 USDC spent
        assert(fillerBalance && ownerBalance && fillerWETHbalance)
    })
    it("Reset balances to 2 WETH for A and 50 USDC for B", async () => {
        await WETH.transfer(A, BigInt(1*10**18), {from: B})
        await USDC.transfer(B, BigInt(25*10**18), {from: A})
        var a_balance = parseInt(await WETH.balanceOf(A)) / 10 ** 18
        var b_balance = parseInt(await USDC.balanceOf(B)) / 10 ** 18
        assert(a_balance === 2 && b_balance === 50)
    })
    it("Create trade for testing excess fillAmount", async () => {
        console.log("  - Testing Excess fillAmount after partial fill")
        await OTC.createTrade(WETH.address, BigInt(1*10**18), USDC.address, BigInt(25*10**18), {from: A})                   // Create trade of 1 WETH for 25 USDC from A,
        assert(parseInt(await WETH.balanceOf(A)) / 10**18 === 1)                                                            // Confirm balance decrease in B
    })
    it("Fill trade partially with 10 USDC", async () => {
        await OTC.fillTrade(3, USDC.address, BigInt(10*10**18), {from: B})                                                  // Fill trade partially by 10 USDC from B
        var WETHbalance = parseInt(await WETH.balanceOf(B)) / 10**18 === 0.4
        assert(parseInt(await USDC.balanceOf(B)) / 10**18 === 40 && WETHbalance)                                            // Ensure A received 10 USDC and B received 0.4 WETH
    })
    it("Fill trade in excess with 20 USDC (remainingWantAmount = 15)", async () => {
        await OTC.fillTrade(3, USDC.address, BigInt(20*10**18), {from: B})
    })
    it("Confirm appropriate balances after testing excess fillAmount after partial fill", async () => {
        var fillerUSDCbalance = parseInt(await USDC.balanceOf(A)) / 10**18 === 25                                           // Filler gets 5 excess back
        var fillerWETHbalance = parseInt(await WETH.balanceOf(A)) / 10**18 === 1                                            // Filler gets 1 WETH from the rest of the trade
        var ownerUSDCbalance = parseInt(await USDC.balanceOf(B)) / 10**18 === 25                                            // Filler gets 5 excess back
        var ownerWETHbalance = parseInt(await WETH.balanceOf(B)) / 10**18 === 1                                             // Filler gets 1 WETH from the rest of the trade
        assert(fillerUSDCbalance && fillerWETHbalance && ownerUSDCbalance && ownerWETHbalance)
    })
    it("Create sample trade for refund test after cancellation of 25 USDC for 1 WETH", async () => {
        console.log("  - Trade cancellation after partial fill")
        await OTC.createTrade(USDC.address, BigInt(25*10**18), WETH.address, BigInt(1*10**18))                              // Create trade of 25 USDC for 1 WETH
        var A_balance = parseInt(await USDC.balanceOf(A)) / 10**18                                                          // Make sure giveAmount transferred from creator to contract
        assert(A_balance === 0)
    })
    it("Fill trade partially by 0.5 WETH", async () => {
        await OTC.fillTrade(4, WETH.address, BigInt(0.5*10**18), {from: B})
    })
    it("Get 12.5 USDC more for using 0.5 WETH in B account (25+12.5=37.5)", async () => {
        var B_balance = parseInt(await USDC.balanceOf(B)) / 10**18
        var B_eth_balance = parseInt(await WETH.balanceOf(B)) / 10**18
        assert(B_balance === 37.5)
    })
    it("Cancel the partially filled trade", async () => {
        await OTC.cancelTrade(4, {from : A})
    })
    it("A gets back 12.5 USDC", async () => {
        var A_balance = parseInt(await USDC.balanceOf(A)) / 10**18
        assert(A_balance === 12.5)                                                                                          // Get the remaining USDC of the trade
    })
    it("B has 0.5 WETH", async () => {
        var B_balance = parseInt(await WETH.balanceOf(B)) / 10**18
        assert(B_balance === 0.5)
    })
    it("A has 1.5 WETH", async () => {
        var A_balance = parseInt(await WETH.balanceOf(A)) / 10**18
        assert(A_balance === 1.5)
    })
})
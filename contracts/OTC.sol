// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract OTC {

    struct Trade {
        address creator;
        uint256 remainingWantAmount;
    
        ERC20 giveToken;
        uint256 giveAmount;
        
        ERC20 wantToken;
        uint256 wantAmount;
    }

    mapping(uint256 => Trade) public trades;
    uint256 public totalTrades;
    
    event TradeCreated(address indexed from, uint256 tradeID);
    event TradePartiallyFilled(address indexed from, uint256 tradeID, uint256 fillAmount);
    event TradeFullyFilled(address indexed from, uint256 tradeID, uint256 fillAmount);
    event TradeCancelled(address indexed from, uint256 tradeID, Trade trade);

    
    function createTrade(ERC20 _giveToken, uint256 _giveAmount, ERC20 _wantToken, uint256 _wantAmount) public {
        require(_giveToken.balanceOf(msg.sender) >= _giveAmount, "Insufficient balance");
        require(_giveToken.allowance(msg.sender, address(this)) >= _giveAmount, "Insufficient allowance");
        _giveToken.transferFrom(msg.sender, address(this), _giveAmount);
        trades[totalTrades] = Trade(msg.sender, _wantAmount, _giveToken, _giveAmount, _wantToken, _wantAmount);
        emit TradeCreated(msg.sender, totalTrades);
        totalTrades += 1;
    }
    
    
    function fillTrade(uint256 tradeID, ERC20 fillToken, uint256 fillAmount) public {
        require(trades[tradeID].creator != address(0x0), "Trade does not exist");
        require(fillToken == trades[tradeID].wantToken, "Incorrect token");
        require(trades[tradeID].wantToken.balanceOf(msg.sender) >= fillAmount, "Insufficient balance");
        require(trades[tradeID].wantToken.allowance(msg.sender, address(this)) >= fillAmount, "Insufficient allowance");
        if(fillAmount > trades[tradeID].remainingWantAmount) {
            fillAmount = trades[tradeID].remainingWantAmount;
        }
        trades[tradeID].remainingWantAmount -= fillAmount;
        trades[tradeID].wantToken.transferFrom(msg.sender, trades[tradeID].creator, fillAmount);
        trades[tradeID].giveToken.transfer(msg.sender, (fillAmount*trades[tradeID].giveAmount)/trades[tradeID].wantAmount);
        if(trades[tradeID].remainingWantAmount == 0){
            delete trades[tradeID];
            emit TradeFullyFilled(msg.sender, tradeID, fillAmount);
        } else {
            emit TradePartiallyFilled(msg.sender, tradeID, fillAmount);
        }
    }
    
    
    function cancelTrade(uint256 tradeID) public {
        require(trades[tradeID].creator != address(0x0), "Trade does not exist");
        require(trades[tradeID].creator == msg.sender, "Not trade owner");
        Trade memory trade = trades[tradeID];
        trades[tradeID].giveToken.transfer(msg.sender, (trade.remainingWantAmount*trade.giveAmount)/trade.wantAmount);
        emit TradeCancelled(msg.sender, tradeID, trade);
        delete trades[tradeID];
    }
}


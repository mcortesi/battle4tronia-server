/*
  Copyright 2018 BattleForTronia.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity ^0.4.19;


/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address private _owner;


  event OwnershipRenounced(address indexed previousOwner);
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  constructor() public {
    _owner = msg.sender;
  }

  /**
   * @return the address of the owner.
   */
  function owner() public view returns(address) {
    return _owner;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(isOwner());
    _;
  }

  /**
   * @return true if `msg.sender` is the owner of the contract.
   */
  function isOwner() public view returns(bool) {
    return msg.sender == _owner;
  }

  /**
   * @dev Allows the current owner to relinquish control of the contract.
   * @notice Renouncing to ownership will leave the contract without an owner.
   * It will not be possible to call the functions with the `onlyOwner`
   * modifier anymore.
   */
  function renounceOwnership() public onlyOwner {
    emit OwnershipRenounced(_owner);
    _owner = address(0);
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) public onlyOwner {
    _transferOwnership(newOwner);
  }

  /**
   * @dev Transfers control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function _transferOwnership(address newOwner) internal {
    require(newOwner != address(0));
    emit OwnershipTransferred(_owner, newOwner);
    _owner = newOwner;
  }
}


/**
 * @title SafeMath
 * @dev Math operations with safety checks that revert on error
 */
library SafeMath {

  /**
  * @dev Multiplies two numbers, reverts on overflow.
  */
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
    // benefit is lost if 'b' is also tested.
    // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
    if (a == 0) {
      return 0;
    }

    uint256 c = a * b;
    require(c / a == b);

    return c;
  }

  /**
  * @dev Integer division of two numbers truncating the quotient, reverts on division by zero.
  */
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b > 0); // Solidity only automatically asserts when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold

    return c;
  }

  /**
  * @dev Subtracts two numbers, reverts on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b <= a);
    uint256 c = a - b;

    return c;
  }

  /**
  * @dev Adds two numbers, reverts on overflow.
  */
  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a);

    return c;
  }

  /**
  * @dev Divides two numbers and returns the remainder (unsigned integer modulo),
  * reverts when dividing by zero.
  */
  function mod(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b != 0);
    return a % b;
  }
}

contract BattleForTronia is Ownable {
  using SafeMath for uint;

  string constant public VERSION = "1.0.0";
  uint8 constant public CLOSE_ID = 1;
  uint8 constant public CLOSE_AND_OPEN_ID = 2;

  struct Channel {
    bool opened;
    uint channelId;
    uint currentRound;
    uint tronium;
    address publicKey;
    address[] collectables;
  }

  struct Dispute {
    bool opened;
    uint round;
    uint withDrawBlock;
    uint tronium;
  }

  struct Move {
    uint max;
    uint payout;
  }

  address public delear;  // Delear address
  uint public troniumPrice;  // How many wei is a Tronium
  uint public disputePeriod; // Blocks to wait for a dispute period
  Move[] moves;

  mapping(address => Channel) public channels; // Percentage times (1 ether)
  mapping(address => Dispute) public disputes; // Percentage times (1 ether)

  event ChannelOpened(
    address playerAddress,
    uint channelId,
    uint tronium,
    address publicKey,
    address[] collectables
  );

  event ChannelCloseAndOpened(
    address playerAddress,
    uint channelId,
    uint tronium,
    address publicKey,
    address[] collectables
  );

  event ChannelClosed(
    address playerAddress,
    uint channelId
  );

   event DisputeSet(
    address playerAddress,
    uint channelId,
    address publicKey,
    uint[11] uints //playerTronium, round, betLevel, betTronium, betLines, randomDelear1, randomDelear2, randomDelear3, randomPlayer1, randomPlayer2, randomPlayer3
    );

  constructor(
    address _delear,
    uint _troniumPrice,
    uint _disputePeriod) public
  {
    delear = _delear;
    troniumPrice = _troniumPrice;
    disputePeriod = _disputePeriod;
  }

  //Deposit
  function deposit()
    payable external onlyOwner
  {}

  //Deposit
  function withdraw(uint amount)
    external onlyOwner
  {
    msg.sender.transfer(amount);
  }

  /// @dev Get tronium price times 1000
  function getTroniumPrice() public view returns (uint) {
    return troniumPrice;
  }

  /// @dev Setter for delear address (Only owner)
  function setDelear(address _delear)
    external onlyOwner
  {
    delear = _delear;
  }

  /// @dev Setter for troniumPrice (Only owner)
  function setTroniumPrice(uint _troniumPrice)
    external onlyOwner
  {
    troniumPrice = _troniumPrice;
  }

  /// @dev Setter for disputePeriod (Only owner)
  function setDdsputePeriod(uint _disputePeriod)
    external onlyOwner
  {
    disputePeriod = _disputePeriod;
  }

  function getChannel(address addr) public view returns (uint, uint, address) {
    Channel memory channel = channels[addr];
    return (
      channel.channelId,
      channel.tronium,
      channel.publicKey
    );
  }

  /// @dev Open a new channel by a player.
  function openChannel(address publicKey) payable external {
    require(!channels[msg.sender].opened, "there is another channel opened, close it first");

    uint tronium = msg.value.div(troniumPrice.mul(1000));  // trx / (troniumPrice / 1000) / 1000000

    Channel memory channel = Channel({
      opened: true,
      channelId: block.number,
      currentRound: 0,
      tronium: tronium,
      publicKey: publicKey,
      collectables: channels[msg.sender].collectables
    });

    channels[msg.sender] = channel;

    emit ChannelOpened(
      msg.sender,
      channel.channelId,
      channel.tronium,
      channel.publicKey,
      channel.collectables
    );
  }

  function closeAndOpenChannel(uint tronium, address newPublicKey, uint8 v, bytes32 r, bytes32 s) payable external {

    require(channels[msg.sender].opened, "channel is not opened");
    require(!disputes[msg.sender].opened, "cannot openclose a channel with a dipute opened");

    bytes32 hash = sha256(abi.encodePacked(
      this,
      msg.sender,
      CLOSE_AND_OPEN_ID,
      channels[msg.sender].channelId,
      tronium,
      channels[msg.sender].publicKey
    ));

    require(ecrecover(hash,v,r,s) == delear, "incorrect delear signature");

    uint totalTronium = msg.value.div(troniumPrice.mul(1000)) + tronium;  // trx / (troniumPrice / 1000) / 1000000

    channels[msg.sender].channelId = block.number;
    channels[msg.sender].currentRound = 0;
    channels[msg.sender].tronium = totalTronium;
    channels[msg.sender].publicKey = newPublicKey;

    emit ChannelCloseAndOpened(
      msg.sender,
      channels[msg.sender].channelId,
      channels[msg.sender].tronium,
      channels[msg.sender].publicKey,
      channels[msg.sender].collectables
    );
  }

  /// @dev Close channel by player.
  function closeChannel(uint tronium, uint8 v, bytes32 r, bytes32 s) payable external {
    require(channels[msg.sender].opened, "channel is not opened");
    require(!disputes[msg.sender].opened, "cannot close a channel with a dipute opened");

    bytes32 hash = sha256(abi.encodePacked(
      this,
      msg.sender,
      CLOSE_ID,
      channels[msg.sender].channelId,
      tronium
    ));

    require(ecrecover(hash,v,r,s) == delear, "incorrect delear signature");

    uint channelId = channels[msg.sender].channelId;
    uint amount = tronium.mul(1000).mul(troniumPrice); // tronium * 1000000 * (troniumPrice / 1000)

    delete channels[msg.sender];

    msg.sender.transfer(amount);

    emit ChannelClosed(msg.sender, channelId);
  }

  //Set probabilities  (prob * 10000 and payout * 10)
  function setProbabilities(uint[2][] moveArray)
    external onlyOwner
  {
      require(moveArray.length ==2 && moveArray[0].length == moveArray[1].length, "incorrect move array format");

      delete moves;

      uint sum = 0;
      for (uint i=0; i< moveArray[0].length; i++) {
          sum += moveArray[0][i];
          moves.push(Move({
            max: sum, //max
            payout: moveArray[1][i] //payout
          }));
       }
  }

  function isPlayerRandomNumberInDispute(
      uint[11] uints
    ) internal pure returns(bool) {
      return uints[8] <= 1000;
  }

  //Create a dispute
  function dispute(
      address playerAddress,
      uint[11] uints, //playerTronium, round, betLevel, betTronium, betLines, randomDelear1, randomDelear2, randomDelear3, randomPlayer1, randomPlayer2, randomPlayer3
      uint8[5] signaturesV, //playerHash1Signature, playerHash2Signature, playerHash3Signature, playerSignature, delearSignature
      bytes32[5] signaturesR,
      bytes32[5] signaturesS
    ) external {

    require(msg.sender == delear || msg.sender == playerAddress, "only player or delear can dispute");
    require(channels[playerAddress].opened, "channel is not opened");
    require(isPlayerRandomNumberInDispute(uints) || msg.sender == delear, "randomPlayer1 can be null (11111) only by delear");

    address playerSigAddress = ecrecover(
        getPlayerMessageHash(playerAddress, uints, signaturesV, signaturesR, signaturesS),
        signaturesV[3],
        signaturesR[3],
        signaturesS[3]
    );
    require(playerAddress == playerSigAddress, "incorrect player signature");

    address delearSigAddress = ecrecover(
        getDelearMessageHash(playerAddress, uints, signaturesV, signaturesR, signaturesS),
        signaturesV[3],
        signaturesR[3],
        signaturesS[3]
    );
    require(delear == delearSigAddress, "incorrect delear signature");


    //if there is not a previous dispute or current round is greater than prev dispute update it
    require(
        !disputes[playerAddress].opened || disputes[playerAddress].round < uints[1]
        , "dispute round is not greater than current"
    );

    //if there are random player numbers, check the validity
    if(isPlayerRandomNumberInDispute(uints)) {
      require(
        checkPlayerNumber(uints[8], signaturesV[0], signaturesR[0], signaturesS[0], playerAddress),
        "player random number 1 does not check"
      );
      require(
        checkPlayerNumber(uints[9], signaturesV[1], signaturesR[1], signaturesS[1], playerAddress),
        "player random number 1 does not check"
      );
      require(
        checkPlayerNumber(uints[10], signaturesV[2], signaturesR[2], signaturesS[2], playerAddress),
        "player random number 1 does not check"
      );
    }

    uint troinum = getGameResult(uints);
    disputes[playerAddress] = Dispute({
        opened: true,
        round: uints[1],
        withDrawBlock: block.number + disputePeriod,
        tronium: troinum
    });

    emit DisputeSet(
        msg.sender,
        channels[playerAddress].channelId,
        channels[playerAddress].publicKey,
        uints
    );

  }

  function withdrawFromDispute() external {
     require(disputes[msg.sender].opened, "there is not dispute dipute opened");
     require(disputes[msg.sender].withDrawBlock >= block.number, "withdraw wait period is not over");

     uint amount = disputes[msg.sender].tronium.mul(1000).mul(troniumPrice); // tronium * 1000000 * (troniumPrice / 1000)

     msg.sender.transfer(amount);

     delete disputes[msg.sender];
  }

  function getPlayerMessageHash(
    address playerAddress,
    uint[11] uints, //playerTronium, round, betLevel, betTronium, betLines, randomDelear1, randomDelear2, randomDelear3, randomPlayer1, randomPlayer2, randomPlayer3
    uint8[5] signaturesV, //playerHash1Signature, playerHash2Signature, playerHash3Signature, playerSignature, delearSignature
    bytes32[5] signaturesR,
    bytes32[5] signaturesS
   ) internal view returns (bytes32) {
      bytes32 playerHashes = sha256(
          abi.encodePacked(
            signaturesV[0],
            signaturesR[0],
            signaturesS[0],
            signaturesV[1],
            signaturesR[1],
            signaturesS[1],
            signaturesV[2],
            signaturesR[2],
            signaturesS[2]
          )
      );
      return sha256(
          abi.encodePacked(
            address(this),
            playerAddress,
            uints[0],
            channels[playerAddress].channelId,
            uints[1],
            channels[playerAddress].publicKey,
            uints[2],
            uints[3],
            uints[4],
            playerHashes
          )
        );
  }

  function getDelearMessageHash(
    address playerAddress,
    uint[11] uints, //playerTronium, round, betLevel, betTronium, betLines, randomDelear1, randomDelear2, randomDelear3, randomPlayer1, randomPlayer2, randomPlayer3
    uint8[5] signaturesV, //playerHash1Signature, playerHash2Signature, playerHash3Signature, playerSignature, delearSignature
    bytes32[5] signaturesR,
    bytes32[5] signaturesS
   ) internal view returns (bytes32) {
      bytes32 playerHashes = sha256(
          abi.encodePacked(
            signaturesV[0],
            signaturesR[0],
            signaturesS[0],
            signaturesV[1],
            signaturesR[1],
            signaturesS[1],
            signaturesV[2],
            signaturesR[2],
            signaturesS[2]
          )
      );
      bytes32 delearHashes = sha256(
          abi.encodePacked(
            uints[5],
            uints[6],
            uints[7]
          )
      );
      return sha256(
          abi.encodePacked(
            address(this),
            playerAddress,
            uints[0],
            channels[playerAddress].channelId,
            uints[1],
            channels[playerAddress].publicKey,
            uints[2],
            uints[3],
            uints[4],
            playerHashes,
            delearHashes
          )
        );
  }

  function checkPlayerNumber(
      uint playerNumber,
      uint8 v,
      bytes32 r,
      bytes32 s,
      address playerAddress
    ) internal pure returns(bool) {
      return playerAddress == ecrecover(
        sha256(abi.encodePacked(playerNumber)),
        v,
        r,
        s
      );
    }

  function getGameResult(
      uint[11] uints //playerTronium, round, betLevel, betTronium, betLines, randomDelear1, randomDelear2, randomDelear3, randomPlayer1, randomPlayer2, randomPlayer3
    ) internal view returns (uint) {
        uint betCost = uints[2] * uints[3] * uints[4];
        uint winnings = getWinnings(betCost, uints[5], uints[8]) +
                        getWinnings(betCost, uints[6], uints[9]) +
                        getWinnings(betCost, uints[7], uints[10]);
        return uints[2] + winnings - betCost;
    }

  function getWinnings(
      uint betCost,
      uint randomDelear,
      uint randomPlayer
    ) internal view returns (uint) {
        if(randomPlayer > 10000)  //If no playernumber is set, it is considered lost
          return 0;
        uint random =  (randomDelear + randomPlayer).div(2);
        for (uint i=0; i< moves.length; i++) {
          if(random <= moves[i].max) {
              return betCost.mul(moves[i].payout).div(10);
          }
        }
        return 0;
    }

}

pragma solidity ^0.4.0;

contract TestTVM {

  address public owner;
  address public lastVoter;
  mapping(address => uint) public votes;

  uint public totalDonations;
  uint public lastDonation;
  uint public constructorParam;

  constructor(uint value) public {
    constructorParam = value;
    owner = msg.sender;
  }

  function aView(string message) public pure returns (string, uint) {
    return (message, 56444);
  }

  /// Give $(toVoter) the right to vote on this ballot.
  /// May only be called by $(chairperson).
  function vote(uint _votes) public {
    votes[msg.sender] += _votes;
    lastVoter = msg.sender;
  }

  function donate() public payable {
    totalDonations += msg.value;
    lastDonation += msg.value;
  }

  function withdraw() public {
    if (msg.sender != owner) {
      revert("only owner");
    }
    msg.sender.transfer(address(this).balance);
  }
}
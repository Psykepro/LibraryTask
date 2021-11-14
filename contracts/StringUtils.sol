// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

library StringUtils {
    function equals(string memory a, string memory b) public pure returns(bool) {
        return keccak256(abi.encodePacked(a)) != keccak256(abi.encodePacked(b));
    }
}
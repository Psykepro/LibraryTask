// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./StringUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Library is Ownable {
    
    using SafeMath for uint;
    
    uint currentIndex;
    
    ////////////
    // Events //
    ////////////
    
    event NewBookCreated(string title, uint id, uint availableCopiesCount);
    event BookBorrowed(string title, uint id, address borrowerAddress, uint borrowStartTimestamp);
    event BookReturned(string title, uint id, address borrowerAddress, uint returnTimestamp);
    
    /////////////
    // Structs //
    ///////////// 

    struct Book {
      uint id;
      uint availableCopiesCount;
      uint borrowedCopiesCount;
      string title;
      bool isCreated;
    }
    
    struct BorrowTrackingInfo {
        uint borrowStartTimestamp;
        uint returnTimestamp;
        address borrowerAddress;
    }
    
    struct BookBorrowState {
        uint currentBorrowTrackingInfoIndex;
        bool isBorrowed;
    }
    
    struct IndexInfo {
        uint id;
        bool exists;
    }
    
    ////////////////
    // Containers //
    ////////////////
    
    /* Storing current borrow state of address for given book id - 
     The key will be by using address and book id joined with underscore '${address}_{bookId}' */
    mapping(bytes => BookBorrowState) public bookBorrowStates;

    // using mapping as index for quick lookup by title
    mapping(string => IndexInfo) public bookIndexByTitle; 
    
    // storing books as dynamic array so to be able to return all current books
    Book[] public bookStorage;

    // storing books borrow tracking records by book id to be able to 
    // get borrowing history for each book
    mapping(uint => BorrowTrackingInfo[]) public borrowHistoryByBookId; 
    
    //////////////
    // External //
    //////////////
    
    function createBook(string memory title, uint copiesCount) external onlyOwner {
        require(StringUtils.equals(title, ""), "Missing value for 'title'.");
        require(copiesCount > 0, "Value for 'copiesCount' must be greater than 0.");
        require(bookIndexByTitle[title].exists == false, "Book already exists.");
        
        uint id = currentIndex;
        Book memory newBook = Book(id, copiesCount, 0, title, true);
        bookStorage.push(newBook);
        bookIndexByTitle[title].id = id;
        bookIndexByTitle[title].exists = true;
        currentIndex = currentIndex.add(1);
        emit NewBookCreated(title, id, copiesCount);
    }
    
    function borrowBookByTitle(string memory title) external {
        Book storage book = _getBookByTitle(title);
        uint borrowStartTimestamp = _borrowBook(book, msg.sender);
        emit BookBorrowed(title, book.id, msg.sender, borrowStartTimestamp);
    }
    
    function borrowBookById(uint id) external {
        Book storage book = _getBookById(id);
        uint borrowStartTimestamp = _borrowBook(book, msg.sender);
        emit BookBorrowed(book.title, book.id, msg.sender, borrowStartTimestamp);
    }

    function getBookBorrowState(address borrowerAddress, uint bookId) external view returns(BookBorrowState memory) {
        bytes memory key = _constructBookBorrowStateKey(borrowerAddress, bookId);
        BookBorrowState storage bookBorrowState = bookBorrowStates[key];

        return bookBorrowState;
    }

    function returnBookByTitle(string memory title) external {
        // If the borrowing needs to be paid this function can be changed as payable and to expect value equals to: borrowedHours * HourRate
        Book storage book = _getBookByTitle(title);
        uint returnTimestamp = _returnBook(book, msg.sender);
        emit BookReturned(title, book.id, msg.sender, returnTimestamp);
    }
    
    function returnBookById(uint id) external {
        // If the borrowing needs to be paid this function can be changed as payable and to expect value equals to: borrowedHours * HourRate
        Book storage book = _getBookById(id);
        uint returnTimestamp = _returnBook(book, msg.sender);
        emit BookReturned(book.title, book.id, msg.sender, returnTimestamp);
    }
    
    function getBookByTitle(string memory title) external view returns(Book memory) {
        return _getBookByTitle(title);
    }
    
    function getBookById(uint bookId) external view returns(Book memory) {
        return _getBookById(bookId);
    }
    
    function getAllBooks() external view returns(Book[] memory) {
        return bookStorage;
    }

    function getBorrowHistoryByBookId(uint bookId) external view returns(BorrowTrackingInfo[] memory) {
        return borrowHistoryByBookId[bookId];
    }
    
    
    //////////////
    // Internal //
    //////////////

    function _getBookById(uint bookId) internal view returns(Book storage) {
        Book storage book = bookStorage[bookId];
        require(book.isCreated == true, "Book doesn't exists.");
        return book;
    }
    
    function _borrowBook(Book storage book, address borrowerAddress) internal returns(uint) {
        require(book.availableCopiesCount > 0, "There are no available copies for that book.");
        bytes memory borrowStateKey = _constructBookBorrowStateKey(borrowerAddress, book.id);
        BookBorrowState storage borrowState = bookBorrowStates[borrowStateKey];
        require(borrowState.isBorrowed == false, "You can borrow a book only once.");
        
        book.availableCopiesCount = book.availableCopiesCount.sub(1);
        book.borrowedCopiesCount = book.borrowedCopiesCount.add(1);
        BorrowTrackingInfo memory borrowTrackingInfo = BorrowTrackingInfo(block.timestamp, 0, borrowerAddress);
        borrowHistoryByBookId[book.id].push(borrowTrackingInfo);
        bookBorrowStates[borrowStateKey].currentBorrowTrackingInfoIndex = borrowHistoryByBookId[book.id].length.sub(1);
        bookBorrowStates[borrowStateKey].isBorrowed = true;
        
        return borrowTrackingInfo.borrowStartTimestamp;
    }

    function _returnBook(Book storage book, address borrowerAddress) internal returns(uint) {
        bytes memory borrowStateKey = _constructBookBorrowStateKey(borrowerAddress, book.id);
        BookBorrowState storage borrowState = bookBorrowStates[borrowStateKey];
        require(borrowState.isBorrowed == true, "You haven't borrow that book.");
       
        book.availableCopiesCount = book.availableCopiesCount.add(1);
        book.borrowedCopiesCount = book.borrowedCopiesCount.sub(1);
        BorrowTrackingInfo storage borrowHistoryByBookIdInfo = borrowHistoryByBookId[book.id][borrowState.currentBorrowTrackingInfoIndex];
        borrowHistoryByBookIdInfo.returnTimestamp = block.timestamp;
        bookBorrowStates[borrowStateKey].isBorrowed = false;
        
        return borrowHistoryByBookIdInfo.returnTimestamp;
    }

    function _constructBookBorrowStateKey(address borrowerAddress, uint bookId) internal pure returns(bytes memory) {
        return abi.encodePacked(borrowerAddress, "_", bookId);
    }
    
    function _getBookByTitle(string memory title) internal view returns(Book storage) {
        require(StringUtils.equals(title, ""), "Missing value for 'title'.");
        IndexInfo storage bookIndexInfo = bookIndexByTitle[title];
        require(bookIndexInfo.exists == true, "Book doesn't exists.");
        return bookStorage[bookIndexInfo.id];
    }
    
}
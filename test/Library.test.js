const { BN, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');

var chai = require("chai");
const chaiBN = require("chai-bn")(BN);
chai.use(chaiBN);
const expect = chai.expect;

const Library = artifacts.require('./Library.sol');

contract("Library", async (accounts) => {

  const [owner, user, secondUser] = accounts;
  
  let firstBookId = 0;
  let firstBookTitle = "Book 1";
  let firstBookCopiesCount = 2;

  describe("as owner", async () => {

    describe("creating book", async () => {
    
      it("should be able to create a book", async () => {
        let contractInstance = await Library.new();
        const result = await contractInstance.createBook(firstBookTitle, firstBookCopiesCount);
        const bookInstance = await contractInstance.bookStorage(0)

        let expectedavailableCopiesCountBN = new BN(firstBookCopiesCount);
        let expectedBookBorrowedCopiesCountBN = new BN(0);
        let expectedBookIdBN = new BN(0);
        let expectedCountOfBooks = 1;

        expectEvent(result, 'NewBookCreated');
        expect(result.logs[0].args.title).to.equal(firstBookTitle);
        expect(result.logs[0].args.id).to.be.a.bignumber.equal(expectedBookIdBN);
        expect(bookInstance.id).to.be.a.bignumber.equal(expectedBookIdBN);
        expect(bookInstance.title).to.be.equal(firstBookTitle);
        expect(bookInstance.availableCopiesCount).to.be.a.bignumber.equal(expectedavailableCopiesCountBN);
        expect(bookInstance.borrowedCopiesCount).to.be.a.bignumber.equal(expectedBookBorrowedCopiesCountBN);
        expect(await contractInstance.getAllBooks()).to.have.lengthOf(expectedCountOfBooks);
      });

      it("shouldn't be able to create a book with providing a empty title", async () => {
        let contractInstance = await Library.new();
        let emptyBookTitle = "";

        await expectRevert(contractInstance.createBook(emptyBookTitle, firstBookCopiesCount), "Missing value for 'title'.");
      });

      it("shouldn't be able to create a book with providing argument 'copiesCount' with value 0", async () => {
        let contractInstance = await Library.new();
        let zeroCopiesCount = 0;
        
        await expectRevert(contractInstance.createBook(firstBookTitle, zeroCopiesCount), "Value for 'copiesCount' must be greater than 0.");
      });

      it("shouldn't be able to create the same book twice", async () => {
        let contractInstance = await Library.new();
    
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount);
    
        await expectRevert(contractInstance.createBook(firstBookTitle, firstBookCopiesCount), "Book already exists.");
      });

    });
      

  });


  describe("as user", async () => {

    describe("creating book", async () => {
      it("shouldn't be able to create a book", async () => {
        let contractInstance = await Library.new();

        await expectRevert(contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: user}), "Ownable: caller is not the owner");
      });
    });

    describe("retrieving books", async () => {

      it("should be able to retrieve all books", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});
  
        let secondBookTitle = "Book 2";
        let secondBookCopiesCount = 2;
        await contractInstance.createBook(secondBookTitle, secondBookCopiesCount, {from: owner});
        
        allBooks = await contractInstance.getAllBooks({from: user})

        let expectedCountOfBooks = 2;

        expect(allBooks).to.have.lengthOf(expectedCountOfBooks);
        expect(allBooks[0].title).to.be.equal(firstBookTitle);
        expect(allBooks[1].title).to.be.equal(secondBookTitle);
      });

      it("should be able to get a book by id", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});

        let bookInstance = await contractInstance.getBookById(firstBookId, {from: user})

        let expectedavailableCopiesCountBN = new BN(firstBookCopiesCount);
        let expectedBookBorrowedCopiesCountBN = new BN(0);
        let expectedBookIdBN = new BN(firstBookId);

        expect(bookInstance.title).to.be.equal(firstBookTitle);
        expect(bookInstance.id).to.be.a.bignumber.equal(expectedBookIdBN);
        expect(bookInstance.availableCopiesCount).to.be.a.bignumber.equal(expectedavailableCopiesCountBN);
        expect(bookInstance.borrowedCopiesCount).to.be.a.bignumber.equal(expectedBookBorrowedCopiesCountBN);
      });

      it("should be able to get a book by title", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});

        let bookInstance = await contractInstance.getBookByTitle(firstBookTitle)

        let expectedavailableCopiesCountBN = new BN(firstBookCopiesCount);
        let expectedBookBorrowedCopiesCountBN = new BN(0);
        let expectedBookIdBN = new BN(firstBookId);

        expect(bookInstance.title).to.be.equal(firstBookTitle);
        expect(bookInstance.id).to.be.a.bignumber.equal(expectedBookIdBN);
        expect(bookInstance.availableCopiesCount).to.be.a.bignumber.equal(expectedavailableCopiesCountBN);
        expect(bookInstance.borrowedCopiesCount).to.be.a.bignumber.equal(expectedBookBorrowedCopiesCountBN);
      });

      it("should be able to get a book by index", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});
  
        let bookInstance = await contractInstance.bookStorage(firstBookId)

        let expectedavailableCopiesCountBN = new BN(firstBookCopiesCount);
        let expectedBookBorrowedCopiesCountBN = new BN(0);
        let expectedBookIdBN = new BN(firstBookId);

        expect(bookInstance.id).to.be.a.bignumber.equal(expectedBookIdBN);
        expect(bookInstance.title).to.be.equal(firstBookTitle);
        expect(bookInstance.availableCopiesCount).to.be.a.bignumber.equal(expectedavailableCopiesCountBN);
        expect(bookInstance.borrowedCopiesCount).to.be.a.bignumber.equal(expectedBookBorrowedCopiesCountBN);
      });

    });

    
    describe("borrowing books", async () => {


      it("should be able to borrow book by title", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});
  
        let borrowResult = await contractInstance.borrowBookByTitle(firstBookTitle, {from: user});
        let borrowTimestamp = await time.latest();
        let bookBorrowState = await contractInstance.getBookBorrowState(user, firstBookId);
        let bookInstance = await contractInstance.getBookByTitle(firstBookTitle);
        let borrowHistory = await contractInstance.getBorrowHistoryByBookId(bookInstance.id);
        let borrowHistoryInfo = borrowHistory[0];
        let borrowEventArgs = borrowResult.logs[0].args;
        let expectedBookIdBN = new BN(firstBookId);
        let expectedBookAvailableCopiesCountBN = new BN(firstBookCopiesCount - 1);
        let expectedBookBorrowedCopiesCountBN = new BN(1);
        let expectedCurrentBorrowTrackingInfoIndexBN = new BN(0);
        
        expectEvent(borrowResult, 'BookBorrowed');
        expect(borrowEventArgs.id).to.be.a.bignumber.equal(expectedBookIdBN);
        expect(borrowEventArgs.title).to.be.equal(firstBookTitle);
        expect(borrowEventArgs.borrowerAddress).to.be.equal(user);
        expect(borrowEventArgs.borrowStartTimestamp).to.be.a.bignumber.equal(borrowTimestamp);
        
        expect(bookBorrowState.isBorrowed).to.be.equal(true);
        expect(bookBorrowState.currentBorrowTrackingInfoIndex).to.be.a.bignumber.equal(expectedCurrentBorrowTrackingInfoIndexBN);

        expect(borrowHistory).to.have.lengthOf(1);
        expect(borrowHistoryInfo.borrowStartTimestamp).to.be.a.bignumber.equal(borrowTimestamp);
        expect(borrowHistoryInfo.borrowerAddress).to.be.equal(user);

        expect(bookInstance.availableCopiesCount).to.be.a.bignumber.equal(expectedBookAvailableCopiesCountBN);
        expect(bookInstance.borrowedCopiesCount).to.be.a.bignumber.equal(expectedBookBorrowedCopiesCountBN);

      });

      it("should be able to borrow book by id", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});
  
        let borrowResult = await contractInstance.borrowBookById(firstBookId, {from: user});
        
        let borrowTimestamp = await time.latest();
        let bookBorrowState = await contractInstance.getBookBorrowState(user, firstBookId);
        let bookInstance = await contractInstance.getBookById(firstBookId);
        let borrowHistory = await contractInstance.getBorrowHistoryByBookId(bookInstance.id);
        let borrowHistoryInfo = borrowHistory[0];
        let borrowEventArgs = borrowResult.logs[0].args;
        let expectedBookIdBN = new BN(firstBookId);
        let expectedBookAvailableCopiesCountBN = new BN(firstBookCopiesCount - 1);
        let expectedBookBorrowedCopiesCountBN = new BN(1);
        let expectedCurrentBorrowTrackingInfoIndexBN = new BN(0);

        expectEvent(borrowResult, 'BookBorrowed');
        expect(borrowEventArgs.id).to.be.a.bignumber.equal(expectedBookIdBN);
        expect(borrowEventArgs.title).to.be.equal(firstBookTitle);
        expect(borrowEventArgs.borrowerAddress).to.be.equal(user);
        expect(borrowEventArgs.borrowStartTimestamp).to.be.a.bignumber.equal(borrowTimestamp);
        
        expect(bookBorrowState.isBorrowed).to.be.equal(true);
        expect(bookBorrowState.currentBorrowTrackingInfoIndex).to.be.a.bignumber.equal(expectedCurrentBorrowTrackingInfoIndexBN);

        expect(borrowHistory).to.have.lengthOf(1);
        expect(borrowHistoryInfo.borrowStartTimestamp).to.be.a.bignumber.equal(borrowTimestamp);
        expect(borrowHistoryInfo.borrowerAddress).to.be.equal(user);

        expect(bookInstance.availableCopiesCount).to.be.a.bignumber.equal(expectedBookAvailableCopiesCountBN);
        expect(bookInstance.borrowedCopiesCount).to.be.a.bignumber.equal(expectedBookBorrowedCopiesCountBN);

      });

      it("shouldn't be able to borrow a book if there are no available copies", async () => {
        let contractInstance = await Library.new();
        let firstBookCopiesCount = 1;
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});
  
        await contractInstance.borrowBookByTitle(firstBookTitle, {from: user});

        await expectRevert(contractInstance.borrowBookByTitle(firstBookTitle, {from: secondUser}), "There are no available copies for that book.");
      });

      it("shouldn't be able to borrow the same book twice", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});
  
        await contractInstance.borrowBookByTitle(firstBookTitle, {from: user});

        await expectRevert(contractInstance.borrowBookByTitle(firstBookTitle, {from: user}), "You can borrow a book only once.");
      });

      it("should be able to get borrow state of a book of another user", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});
  
        await contractInstance.borrowBookByTitle(firstBookTitle, {from: user});
        
        let bookBorrowState = await contractInstance.getBookBorrowState(user, firstBookId, {from: secondUser});
        let expectedCurrentBorrowTrackingInfoIndexBN = new BN(0);

        expect(bookBorrowState.isBorrowed).to.be.equal(true);
        expect(bookBorrowState.currentBorrowTrackingInfoIndex).to.be.a.bignumber.equal(expectedCurrentBorrowTrackingInfoIndexBN);
      });

      it("should be able to get borrow history by book id", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});
  
        await contractInstance.borrowBookById(firstBookId, {from: user});
        
        let borrowTimestamp = await time.latest();
        let borrowHistory = await contractInstance.getBorrowHistoryByBookId(firstBookId);
        let borrowHistoryInfo = borrowHistory[0];

        expect(borrowHistory).to.have.lengthOf(1);
        expect(borrowHistoryInfo.borrowStartTimestamp).to.be.a.bignumber.equal(borrowTimestamp);
        expect(borrowHistoryInfo.borrowerAddress).to.be.equal(user);
      });

      it("should have proper length of borrow history result on multiple users borrowing the same book", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});

        await contractInstance.borrowBookById(firstBookId, {from: user});
        await contractInstance.borrowBookById(firstBookId, {from: secondUser});

        let borrowHistory = await contractInstance.getBorrowHistoryByBookId(firstBookId);

        expect(borrowHistory).to.have.lengthOf(2);
      });

    });
    
    describe("returning books", async () => {

      it("should be able to return a book by title", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});
  
        await contractInstance.borrowBookByTitle(firstBookTitle, {from: user});
        let borrowTimestamp = await time.latest();
        let returnResult = await contractInstance.returnBookByTitle(firstBookTitle, {from: user});
        let returnTimestamp = await time.latest();

        
        let bookBorrowState = await contractInstance.getBookBorrowState(user, firstBookId);
        let bookInstance = await contractInstance.getBookByTitle(firstBookTitle);
        let borrowHistory = await contractInstance.getBorrowHistoryByBookId(bookInstance.id);
        let borrowHistoryInfo = borrowHistory[0];
        let returnEventArgs = returnResult.logs[0].args;
        let expectedBookIdBN = new BN(firstBookId);
        let expectedBookAvailableCopiesCountBN = new BN(firstBookCopiesCount);
        let expectedBookBorrowedCopiesCountBN = new BN(0);
        
        expectEvent(returnResult, 'BookReturned');
        expect(returnEventArgs.id).to.be.a.bignumber.equal(expectedBookIdBN);
        expect(returnEventArgs.title).to.be.equal(firstBookTitle);
        expect(returnEventArgs.borrowerAddress).to.be.equal(user);
        expect(returnEventArgs.returnTimestamp).to.be.a.bignumber.equal(returnTimestamp);
        
        expect(bookBorrowState.isBorrowed).to.be.equal(false);

        expect(borrowHistory).to.have.lengthOf(1);
        expect(borrowHistoryInfo.borrowStartTimestamp).to.be.a.bignumber.equal(borrowTimestamp);
        expect(borrowHistoryInfo.borrowerAddress).to.be.equal(user);

        expect(bookInstance.availableCopiesCount).to.be.a.bignumber.equal(expectedBookAvailableCopiesCountBN);
        expect(bookInstance.borrowedCopiesCount).to.be.a.bignumber.equal(expectedBookBorrowedCopiesCountBN);

      });

      it("should be able to return a book by id", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});
  
        await contractInstance.borrowBookById(firstBookId, {from: user});
        let borrowTimestamp = await time.latest();
        let returnResult = await contractInstance.returnBookById(firstBookId, {from: user});
        let returnTimestamp = await time.latest();

        
        let bookBorrowState = await contractInstance.getBookBorrowState(user, firstBookId);
        let bookInstance = await contractInstance.getBookById(firstBookId);
        let borrowHistory = await contractInstance.getBorrowHistoryByBookId(bookInstance.id);
        let borrowHistoryInfo = borrowHistory[0];
        let returnEventArgs = returnResult.logs[0].args;
        let expectedBookIdBN = new BN(firstBookId);
        let expectedBookAvailableCopiesCountBN = new BN(firstBookCopiesCount);
        let expectedBookBorrowedCopiesCountBN = new BN(0);
        
        expectEvent(returnResult, 'BookReturned');
        expect(returnEventArgs.id).to.be.a.bignumber.equal(expectedBookIdBN);
        expect(returnEventArgs.title).to.be.equal(firstBookTitle);
        expect(returnEventArgs.borrowerAddress).to.be.equal(user);
        expect(returnEventArgs.returnTimestamp).to.be.a.bignumber.equal(returnTimestamp);
        
        expect(bookBorrowState.isBorrowed).to.be.equal(false);

        expect(borrowHistory).to.have.lengthOf(1);
        expect(borrowHistoryInfo.borrowStartTimestamp).to.be.a.bignumber.equal(borrowTimestamp);
        expect(borrowHistoryInfo.borrowerAddress).to.be.equal(user);

        expect(bookInstance.availableCopiesCount).to.be.a.bignumber.equal(expectedBookAvailableCopiesCountBN);
        expect(bookInstance.borrowedCopiesCount).to.be.a.bignumber.equal(expectedBookBorrowedCopiesCountBN);

      });

      it("shouldn't be able to return book which isn't borrowed by the same address", async () => {
        let contractInstance = await Library.new();
        await contractInstance.createBook(firstBookTitle, firstBookCopiesCount, {from: owner});

        await expectRevert(contractInstance.returnBookByTitle(firstBookTitle, {from: user}), "You haven't borrow that book.");
      });
    })

  });

});

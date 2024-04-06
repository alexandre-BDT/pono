import { Collection, Db, InsertOneResult, ObjectId, Sort } from 'mongodb'
import { Book, Compilation, CompilationAggregation, CustomListingBook, DbDocument, ListingBook, Page, Params } from './types'
import { readFolder } from './readFolder';
import formatSort from './utils/formatSort';
import pricingApi from './utils/pricingAPI';
import { checkMissingProps, checkUnexpectedProps } from './utils/validateInput';
import { calculCost } from './utils/calculCost';

class Library {
  private database: Db
  private booksCollection: Collection<Book>
  private pagesCollection: Collection<Page>
  private compilationCollection: Collection<Compilation>

  constructor(database: Db) {
    this.database = database
    this.booksCollection = database.collection<Book>("books")
    this.pagesCollection = database.collection<Page>("pages")
    this.compilationCollection = database.collection<Compilation>("compilations")
  }

  private async addBook(book: Book): Promise<InsertOneResult<Book>> {
    try {
      const newBook = this.booksCollection.insertOne({ ...book, _id: new ObjectId() })
      return newBook
    } catch (err) {
      throw err
    }
  }

  private async addPage(page: Page): Promise<void> {
    try {
      await this.pagesCollection.insertOne(page)
    } catch (err) {
      throw err
    }
  }

  async get(bookId: string): Promise<Book | null> {
    try {
      const book = await this.booksCollection.findOne({ _id: new ObjectId(bookId) })
      return book
    } catch (err) {
      throw err
    }
  }

  async add(book: Book, pages: Omit<Page, "bookId">[]): Promise<InsertOneResult<Book>> {
    try {
      if (!book || !pages) throw new Error("Missing argument")
      checkMissingProps(book, ["author", "title", "releaseDate"])
      const newBook = await this.booksCollection.insertOne({
        author: book.author,
        title: book.title,
        releaseDate: book.releaseDate,
        _id: new ObjectId()
      })
      const linkedPages = pages.map((elem) => ({ content: elem.content, pageNumber: elem.pageNumber, bookId: newBook.insertedId }))
      this.pagesCollection.insertMany(linkedPages)
      return newBook
    } catch (err) {
      throw err
    }
  }

  async import(path: string): Promise<void> {
    try {
      if (!path) throw new Error("Missing path")
      await readFolder(path, this.addPage.bind(this), this.addBook.bind(this))
    } catch (err) {
      throw err
    }
  }

  async list(page: number, params?: Params): Promise<{ books: ListingBook[], total: number }> {
    try {
      const { filter, search } = params || {}
      var searchParam: any = {}
      var sortFilter = {} as Sort
      if (filter)
        sortFilter = formatSort(filter)
      if (search) {
        if (search?.dateRange)
          searchParam.releaseDate = { $gte: search.dateRange.start, $lte: search.dateRange.end }
        if (search?.author)
          searchParam.author = { $regex: new RegExp(`.*${search.author}.*`, "i") }
        if (search?.title)
          searchParam.title = { $regex: new RegExp(`.*${search.title}.*`, "i") }
      }

      const total = await this.booksCollection.countDocuments(searchParam)
      const books = await this.booksCollection.
        find(searchParam)
        .project({ title: 1, releaseDate: 1 })
        .sort(sortFilter)
        .skip(page * 5)
        .limit(5)
        .toArray() as ListingBook[]
      return { books, total }
    } catch (err) {
      throw err
    }
  }

  async customList(page: number, params?: Params): Promise<{ books: CustomListingBook[], total: number }> {
    try {
      const { filter, search } = params || {}
      var searchParam: any = {}
      var sortFilter = {} as Sort
      if (filter)
        sortFilter = formatSort(filter)
      if (search) {
        if (search?.dateRange)
          searchParam.releaseDate = { $gte: search.dateRange.start, $lte: search.dateRange.end }
        if (search?.author)
          searchParam.author = { $regex: new RegExp(`.*${search.author}.*`, "i") }
        if (search?.title)
          searchParam.title = { $regex: new RegExp(`.*${search.title}.*`, "i") }
      }

      const total = await this.booksCollection.countDocuments(searchParam)
      const books = await this.booksCollection.
        aggregate([
          { $match: searchParam },
          {
            $lookup: {
              from: "pages",
              localField: "_id",
              foreignField: "bookId",
              as: "pages"
            }
          },
          { $unwind: "$pages" },
          { $sort: { "pages.content": 1 } },
          {
            $group: {
              _id: "$_id",
              author: { $first: "$author" },
              releaseDate: { $first: "$releaseDate" },
              title: { $first: "$title" },
              pages: { $push: "$pages" }
            }
          }
        ])
        .skip(page * 5)
        .limit(5)
        .toArray() as Omit<CustomListingBook, "price">[]
      const bookPrices: CustomListingBook[] = await Promise.all(books.map(async (elem) => {
        try {
          const price = await pricingApi(elem._id.toString());
          return { ...elem, price };
        } catch (err) {
          throw err
        }
      }));
      return { books: bookPrices, total }
    } catch (err) {
      throw err
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!id) throw new Error("Missing id")
      const bookId = new ObjectId(id)

      const exist = await this.booksCollection.findOne({ _id: bookId })
      if (!exist)
        throw new Error("Book not found")

      await this.booksCollection.deleteOne({ _id: bookId })
      await this.pagesCollection.deleteMany({ bookId: bookId })
    } catch (err) {
      throw err
    }
  }

  async update(id: string, update: any): Promise<void> {
    try {
      checkUnexpectedProps(update, ["title", "author", "releaseDate"])
      const bookId = new ObjectId(id)

      const exist = await this.booksCollection.findOne({ _id: bookId })
      if (!exist)
        throw new Error("Book not found")

      const res = await this.booksCollection.updateOne({ _id: bookId }, { $set: update })
    } catch (err) {
      throw err
    }
  }

  async createCollection(list: { list: string[], title: string }[]): Promise<void> {
    if (!list) throw new Error("Missing list argument")

    try {
      for (const compilation of list) {
        const ObjectIdList = compilation.list.map((elem) => new ObjectId(elem))
        await this.compilationCollection.insertOne({ bookListId: ObjectIdList, title: compilation.title })
      }
    } catch (err) {
      throw err
    }
  }

  async collection(colletion: string): Promise<any> {
    try {
      if (!colletion) throw new Error("Missing collection id")
      const data: CompilationAggregation[] = await this.compilationCollection.aggregate<CompilationAggregation>([
        { $match: { _id: new ObjectId(colletion) } },
        {
          $lookup: {
            from: "books",
            localField: "bookListId",
            foreignField: "_id",
            as: "books"
          }
        },
        { $unwind: "$books" },
        {
          $lookup: {
            from: "pages",
            localField: "books._id",
            foreignField: "bookId",
            as: "pages"
          }
        },
        { $unwind: "$pages" },
        { $sort: { "pages.content": 1 } },
        {
          $group: {
            _id: "$_id",
            pages: { $push: "$pages" },
            title: { $first: "$title" },
            books: { $first: "$bookListId" }
          }
        }
      ]).toArray()

      const bookPrices: number[] = await Promise.all(data[0].books.map(async (elem: ObjectId) => {
        try {
          const price = await pricingApi(elem.toString());
          return Number(price)
        } catch (err) {
          throw err
        }
      }));
      const total = bookPrices.reduce((prev, curr) => prev += curr, 0)
      const cost = calculCost(data[0].books.length, total).toFixed(2)
      return { ...data[0], cost }
    } catch (err) {
      throw err
    }
  }
}

export default Library

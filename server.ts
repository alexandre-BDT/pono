import { Db, MongoClient } from 'mongodb'
import Library from './lib/main'

const url = 'mongodb://localhost:27017'
const client = new MongoClient(url)
const BOOK = { title: "testing", author: "author", releaseDate: new Date() }
const PAGES = [{ content: "1", pageNumber: 0 }]

async function chargeTesting(db: Db) {
  const library = new Library(db)
  const promise = new Array(10000).fill(null).map(async () => await library.list(1))

  const library2 = new Library(db)
  const randomBook = await library2.list(0)
  const promise2 = new Array(10000).fill(null).map(async (_, index) => await library2.update(randomBook.books[0]._id.toString(), { author: index.toString() }))

  await Promise.all(promise)
  await Promise.all(promise2)
}

async function importBooks(library: Library) {
  try {
    await library.import("./ebook")
    const total = await library.list(0)
    if (total.total !== 11) console.log("Import failed")
    else console.log("Import success")
  } catch (err) {
    throw err
  }
}

async function deleteOne(library: Library) {
  try {
    const books = await library.list(1)
    await library.delete(books.books[0]._id.toString())
    const book = await library.get(books.books[0]._id.toString())
    if (!book) console.log("book deleted")
    else console.log("book delete failed")
  } catch (err) {
    throw err
  }
}

async function addOne(library: Library) {
  try {
    const newBook = await library.add(BOOK, PAGES)
    if (!newBook.acknowledged) return console.log("Add book failed")
    return console.log("Book added")
  } catch (err) {
    throw err
  }
}

async function listing(library: Library) {
  try {
    const books = await library.customList(0, { filter: { author: "desc", date: "asc" }, search: { author: "b", dateRange: { start: new Date("1900"), end: new Date("2010") } } })
    if (books.total !== 3) return console.log("cutom listing failed")
    if (books.books[0].author !== "Billinghurst, Percy J.") return console.log("cutom listing failed")
    console.log("Custom listing OK")
  } catch (err) {
    throw err
  }
}

async function main() {
  try {
    await client.connect()
    const db = client.db("pono")
    const library = new Library(db)
    await importBooks(library)
    await deleteOne(library)
    await addOne(library)
    await listing(library)
    await chargeTesting(db)
    await db.dropDatabase()
    await client.close()
  } catch (err) {
    console.log(err)
  }
}

main()
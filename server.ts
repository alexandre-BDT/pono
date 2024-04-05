import { Db, MongoClient } from 'mongodb'
import Library from './lib/main'
const url = 'mongodb://localhost:27017'
const client = new MongoClient(url)

async function chargeTesting(db: Db) {
  const library = new Library(db)
  const promise = new Array(10000).fill(null).map(async () => await library.list(1))

  const library2 = new Library(db)
  const promise2 = new Array(10000).fill(null).map(async (_, index) => await library2.update("660ebd33564ec8e814198951", { author: index.toString() }))

  await Promise.all(promise)
  await Promise.all(promise2)
}

async function deleteOne(library: Library) {
  try {
    const books = await library.list(1)
    const del = await library.delete(books.books[0]._id.toString())
  } catch (err) {
    console.log(err)
  }
}

async function main() {
  try {
    await client.connect()
    const db = client.db("pono")
    const library = new Library(db)
    await library.import("./ebook")
    await deleteOne(library)
    await chargeTesting(db)
    await db.dropDatabase()
    await client.close()
  } catch (err) {
    console.log(err)
  }
}

main()
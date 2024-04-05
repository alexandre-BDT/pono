import * as fs from 'node:fs/promises';
import { Book, Page } from './types';
import { InsertOneResult } from 'mongodb';
import { Dirent } from "node:fs"
import path from "node:path"

const README_REGEX = /URL: (?<url>.+)\nTitle: (?<title>.+)\nAuthor: (?<author>.+)\nRelease: (?<release>.+)/

function bookInfo(text: string): Omit<Book, "_id"> {
  const match = text.match(README_REGEX)

  if (!match || !match.groups)
    throw new Error('malformed readme')

  return {
    title: match.groups.title,
    author: match.groups.author,
    releaseDate: new Date(match.groups.release),
  }
}

async function readPage(path: string): Promise<string> {
  try {
    const content = await fs.readFile(path, { encoding: "utf-8" })
    return content
  } catch (err) {
    throw err
  }
}

async function bookFolder(
  folder: Dirent,
  addPage: (page: Page) => Promise<void>,
  addBook: (book: Omit<Book, "_id">) => Promise<InsertOneResult<Book>>
) {
  try {
    const bookDir = path.join(folder.path, folder.name)
    const readme = await fs.readFile(path.join(bookDir, "readme.md"), { encoding: "utf-8" })
    const pages = await fs.readdir(bookDir, { withFileTypes: true })

    const info = bookInfo(readme)
    const book = await addBook(info)

    for (const page of pages) {
      if (page.isFile() && path.extname(page.name) === ".txt") {
        try {
          const content = await readPage(path.join(bookDir, page.name))
          await addPage({
            content,
            pageNumber: Number(path.parse(page.name).name),
            bookId: book.insertedId,
          })
        } catch (err) {
          throw err
        }
      }
    }

  } catch (err) {
    throw err
  }
}

export async function readFolder(
  path: string,
  addPage: (page: Page) => Promise<void>,
  addBook: (book: Omit<Book, "_id">) => Promise<InsertOneResult<Book>>
) {
  try {
    const folders = await fs.readdir(path, { withFileTypes: true })
    for (const folder of folders) {
      await bookFolder(folder, addPage, addBook)
    }
  } catch (err) {
    console.log(err)
    throw err
  }
}
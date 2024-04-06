import { ObjectId } from "mongodb"

export interface Page {
  pageNumber: number,
  content: string,
  bookId: ObjectId,
}

export interface Book {
  title: string,
  author: string,
  releaseDate: Date,
}

export interface DbDocument {
  _id: ObjectId
}

export type ListingBook = Omit<Book, "author"> & DbDocument

export interface CustomListingBook extends Book, DbDocument {
  price: string
  pages: Page[]
}

export interface UpdateBook {
  title?: string,
  author?: string,
  releaseDate?: Date
}

type sortDirection = "asc" | "desc"

export interface Filter {
  date?: sortDirection
  title?: sortDirection
  author?: sortDirection
}

export interface Search {
  dateRange?: { start: Date, end: Date }
  title?: string
  author?: string
}

export interface Params {
  search?: Search
  filter?: Filter
}

export interface Compilation {
  bookListId: ObjectId[]
  title: string
}

export interface CompilationAggregation {
  _id: ObjectId
  pages: Page[]
  title: string
  books: ObjectId[]
}
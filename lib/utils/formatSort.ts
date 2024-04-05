import { Sort, SortDirection } from "mongodb";
import { Filter } from "../types";

export default function formatSort(filter: Filter): Sort {
  var sort: Sort = {}

  Object.entries(filter).forEach(([key, value]) => {
    const direction: SortDirection = value
    if (key === "date") {
      (sort as any)["releaseDate"] = direction
    } else {
      (sort as any)[key] = direction
    }
  })
  return sort
}
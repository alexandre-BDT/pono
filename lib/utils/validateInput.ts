export function checkUnexpectedProps<T extends Object>(obj: T, expected: string[]) {
  for (const prop in obj) {
    if (!expected.includes(prop))
      throw new Error("Unexpected properties")
  }
  return true
}

export function checkMissingProps<T extends Object>(obj: T, expected: string[]) {
  for (const prop of expected) {
    if (!(prop in obj))
      throw new Error("Missing propeties")
  }
  return true
}
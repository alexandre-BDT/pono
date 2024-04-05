function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pricingApi(bookId: string): Promise<string> {
  const randomPrice = (Math.random() * 100).toFixed(2)
  const randomDelay = Math.random() * 1000

  await delay(randomDelay)
  return randomPrice
}

export default pricingApi
export function wordCount(text) {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function isBot(author) {
  if (!author) return true
  if (author.__typename === 'Bot') return true
  return /\[bot\]$/i.test(author.login ?? '')
}

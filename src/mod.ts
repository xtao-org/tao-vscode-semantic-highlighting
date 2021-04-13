export type Tao = {tao: Part[]}
export type Part = Tree | Op | Note
export type Tree = {tree: Tao} & TokenInfo
export type Op = {op: string} & TokenInfo
export type Note = {note: string} & TokenInfo

const other = {other: 'UNRECOGNIZED'}
type Other = typeof other

type TokenInfo = {start: InputInfo, end: InputInfo}
type InputInfo = {line: number, column: number, position: number}

type Input = {
  done(): boolean;
  at(symbol: string): boolean;
  next(): string;
  info(): InputInfo;
  error(name: string): never;
  bound(symbol: string): void;
  unbound(): void;
  atBound(): boolean;
}

export function parse(str: string): Tao {
  const {length} = str
  let position = 0
  let line = 0
  let column = 0
  const bounds: [number, string][] = []
  const input: Input = {
    done() { return position >= length },
    at(symbol: string) { return str[position] === symbol },
    next() { 
      const symbol = str[position++]
      ++column
      if (symbol === '\n') {
        column = 0
        line += 1
      }
      return symbol
    },
    info() { return {line, position, column} },
    error(name: string) { throw Error(`ERROR: malformed ${name} at ${position}.`) },
    bound(symbol: string) { bounds.push([position, symbol]) },
    unbound() { bounds.pop() },
    atBound() {
      const {length} = bounds
      if (length > 0) {
        const [position, symbol] = bounds[length - 1]
        if (input.done()) throw Error(
            `ERROR: since ${position} expected "${symbol}" before end of input`
        )
        return input.at(symbol)
      }
      return input.done()
    },
  }
  return tao(input)
}
export function unparse(ast: Tao): string {
  return ast.tao.reduce((acc, next) => acc + unparsePart(next), "")
}
function unparsePart(ast: Part): string {
  if (isTree(ast)) return '[' + unparse(ast.tree) + ']'
  if (isNote(ast)) return ast.note
  if (isOp(ast)) return '`' + ast.op

  throw Error(`Invalid JSON AST of TAO: ${JSON.stringify(ast)}`)
}
export function isTree(ast: Part): ast is Tree {
  return !!(ast as Tree).tree
}
export function isNote(ast: Part): ast is Note {
  return !!(ast as Note).note
}
export function isOp(ast: Part): ast is Op {
  return !!(ast as Op).op
}

function tao(input: Input): Tao {
  const tao = []
  while (true) {
    if (input.atBound()) return {tao}
    let part: Part | Other = tree(input)
    if (part === other) {
      part = op(input)
      if (part === other) part = note(input)
    }
    tao.push(part as Part)
  }
}
function tree(input: Input): Tree | Other {
  if (input.at('[')) {
    const start = input.info()
    input.next()
    input.bound(']')
    const tree = tao(input)
    input.unbound()
    input.next()
    const end = input.info()
    return {tree, start, end}
  }
  return other
}
function op(input: Input): Op | Other {
  if (input.at('`')) {
    const start = input.info()
    input.next()
    if (input.done()) input.error('op')
    return {op: input.next(), start, end: input.info()}
  }
  return other
}
function note(input: Input): Note {
  const start = input.info()
  if (meta(input)) input.error('note')
  let note = input.next()
  while (true) {
    if (meta(input) || input.done()) {
      const end = input.info()
      return {note, start, end}
    }
    note += input.next()
  }
}

function meta(input: Input): boolean {
  return input.at('[') || input.at('`') || input.at(']')
}
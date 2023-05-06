// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import * as express from 'express'
import * as http from 'http'
import { TextDecoder } from 'util'

type Notebook = {
  uri: string
  notebookType: string
  version: number
  isDirty: boolean
  isUntitled: boolean
  isClosed: boolean
  metadata: { [key: string]: any }
  cellCount: number
  cells: Cell[]
}

type Cell = {
  index: number
  kind: vscode.NotebookCellKind
  document: Document
  metadata: { [key: string]: any }
  outputs: Output[]
  executionSummary?: vscode.NotebookCellExecutionSummary
}

type Document = {
  text: string
}

type Output = {
  items: OutputItem[]
  metadata?: { [key: string]: any }
}

type OutputItem = {
  mime: string
  data: string
}

const cell = (cell: vscode.NotebookCell): Cell => ({
  index: cell.index,
  kind: cell.kind,
  document: document(cell.document),
  metadata: cell.metadata,
  outputs: cell.outputs.map(output),
  executionSummary: cell.executionSummary,
})

const document = (document: vscode.TextDocument): Document => ({
  text: document.getText(),
})

const output = (output: vscode.NotebookCellOutput): Output => ({
  items: output.items.map(outputItem),
  metadata: output.metadata,
})

const outputItem = (outputItem: vscode.NotebookCellOutputItem): OutputItem => {
  let data: string

  if (
    outputItem.mime.startsWith('text/') ||
    outputItem.mime === 'application/json' ||
    outputItem.mime === 'application/vnd.code.notebook.stdout' ||
    outputItem.mime === 'application/vnd.code.notebook.stderr' ||
    outputItem.mime === 'application/vnd.code.notebook.error'
  ) {
    const decoder = new TextDecoder()
    data = decoder.decode(outputItem.data)
  } else {
    data = Buffer.from(outputItem.data).toString('base64')
  }

  return {
    mime: outputItem.mime,
    data: data,
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "notebook-server" is now active!'
  )

  const app = express()
  app.get('/notebook', (req, res) => {
    const activeNotebook: vscode.NotebookDocument | undefined =
      vscode.window.activeNotebookEditor?.notebook
    if (!activeNotebook) {
      res.status(404).send('No active notebook')
      return
    }
    const notebook: Notebook = {
      uri: activeNotebook.uri.toString(),
      notebookType: activeNotebook.notebookType,
      version: activeNotebook.version,
      isDirty: activeNotebook.isDirty,
      isUntitled: activeNotebook.isUntitled,
      isClosed: activeNotebook.isClosed,
      metadata: activeNotebook.metadata,
      cellCount: activeNotebook.cellCount,
      cells: activeNotebook.getCells().map(cell),
    }
    res.send(notebook)
  })

  const config = vscode.workspace.getConfiguration('notebookServer')
  const port = config.get('port', 4903)

  const server = http.createServer(app)
  server.listen(port, () => {
    console.log(`Notebook monitoring server listening on port ${port}`)
  })
  context.subscriptions.push({ dispose: server.close })
}

// this method is called when your extension is deactivated
export function deactivate() {}

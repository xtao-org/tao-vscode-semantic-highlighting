import * as vscode from 'vscode';
import {isNote, isOp, isTree, parse, Part} from './mod'

const legend = (function () {
	const tokenTypesLegend = [
		'comment', 'string', 'keyword', 'number', 'regexp', 'operator', 'namespace',
		'type', 'struct', 'class', 'interface', 'enum', 'typeParameter', 'function',
		'method', 'macro', 'variable', 'parameter', 'property', 'label'
	];

	const tokenModifiersLegend = [
		'declaration', 'documentation', 'readonly', 'static', 'abstract', 'deprecated',
		'modification', 'async'
	];

	return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.languages.registerDocumentRangeSemanticTokensProvider(
			{ language: 'tao'}, 
			new DocumentSemanticTokensProvider(), 
			legend,
		)
	)
}

function pushTokens(builder: vscode.SemanticTokensBuilder, tao: Part[]) {
	let isFlat = true
	if (tao.some(p => isTree(p))) isFlat = false
	tao.forEach(token => {
		if (isNote(token)) {
			const lines =	token.note.split('\n')

			const {line: startLine, column} = token.start
			
			builder.push(
				new vscode.Range(
					new vscode.Position(
						startLine,
						column,
					),
					new vscode.Position(
						startLine,
						column + lines[0].length,
					)
				),
				encodeTokenType(token, isFlat),
			)
			
			lines.slice(1).forEach((line, index) => {
				const range = new vscode.Range(
					new vscode.Position(
						startLine + index + 1,
						0,
					),
					new vscode.Position(
						startLine + index + 1,
						line.length,
					)
				)
				builder.push(
					range,
					encodeTokenType(token, isFlat)
				)
			})
		} else if (isTree(token)) {
			pushTokens(builder, token.tree.tao)
		} else {
			const range = new vscode.Range(
				new vscode.Position(
					token.start.line,
					token.start.column,
				),
				new vscode.Position(
					token.end.line,
					token.end.column,
				)
			)
			builder.push(
				range,
				encodeTokenType(token, isFlat),
			)
		}
	})
}

function encodeTokenType(token: Part, isFlat = true): string {
	if (isOp(token)) return 'operator'
	if (isFlat) return 'string'
	return 'keyword'
}

// https://code.visualstudio.com/api/language-extensions/overview
// todo: read https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide
// use DocumentRangeSemanticTokensProvider instead -- adjust mod/parser accordingly
class DocumentSemanticTokensProvider implements vscode.DocumentRangeSemanticTokensProvider {
	async provideDocumentRangeSemanticTokens(
		document: vscode.TextDocument,
		range: vscode.Range,
		token: vscode.CancellationToken,
	): Promise<vscode.SemanticTokens> {
		const tao = parse(document.getText()).tao
		console.log(tao)
		const builder = new vscode.SemanticTokensBuilder(legend);

		pushTokens(builder, tao)
		return builder.build();
	}
}

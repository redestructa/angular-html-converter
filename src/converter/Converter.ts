import * as html from "angular-html-parser/lib/compiler/src/ml_parser/ast";
import * as ngParser from "angular-html-parser";
import {getElementsByTagName} from "../utils";
import {Conversion} from "./description/Conversion";
import {ElementConverter} from "./ElementConverter";
import {Definition} from "./description/Definition";
import {SimpleElement} from "./simple/SimpleElement";
import {SimpleTextElement} from "./simple/SimpleTextElement";
import {SimpleAttribute} from "./simple/SimpleAttribute";
import {ConverterConfig} from "../ConverterConfig";

export interface ConversionPair {
    from: html.Element;
    to: (SimpleTextElement|SimpleElement)[]|null;
}

export class Converter {

    private definition!: Definition;


    convertByDefinition(definition: Definition|undefined, angularTemplate: string, currentFile?:string): string {

        if (!definition || !definition.conversions) {
            return angularTemplate;
        }

        this.definition = definition;

        definition.conversions.forEach(conversion => {
            let currentOffset = 0;
            this.convert(conversion, angularTemplate, currentFile).forEach(conversionPair => {
                const start = conversionPair.from.startSourceSpan?.start.offset || 0;
                const end = conversionPair.from.endSourceSpan?.end.offset || 0;
                const curWhiteSpace = this.countCurSpaces(angularTemplate, start + currentOffset);
                const rendered = this.render(conversionPair.to, curWhiteSpace).substring(curWhiteSpace);
                const diff = rendered.length - (end - start);
                angularTemplate = angularTemplate.substring(0, start + currentOffset) + rendered + angularTemplate.substring(end + currentOffset);
                currentOffset += diff;
            });
        });
        return angularTemplate;
    }

    private convert(conversion: Conversion, angularTemplate: string, currentFile?: string): ConversionPair[] {
        const elementDescription = conversion.element;

        const potentialElementsToConvert = getElementsByTagName(ngParser.parse(angularTemplate).rootNodes, elementDescription.name)

        let lastSpanEndOriginalElement = 0;

        const conversionPairs = potentialElementsToConvert.map(originalElement => {

            const elementConverter = new ElementConverter(originalElement, elementDescription, conversion, this.definition);
            if (elementConverter.validate(originalElement, elementDescription)) {

                if (typeof originalElement.startSourceSpan?.start.offset !== 'number') {
                    throw new Error('original start offset cannot be determined')
                }

                if (typeof originalElement.endSourceSpan?.end.offset !== 'number') {
                    throw new Error('original end offset cannot be determined')
                }

                const startOffset = originalElement.startSourceSpan?.start.offset as number;
                const endOffset = originalElement.endSourceSpan?.end.offset as number;
                if (startOffset < lastSpanEndOriginalElement) {
                    const parent = potentialElementsToConvert[potentialElementsToConvert.indexOf(originalElement) - 1].name;
                    const current = originalElement.name;
                    const line = originalElement.startSourceSpan?.start.line + 1;
                    const foundFileLine = currentFile ? (currentFile + ':' + line) : `line ${line}`;
                    console.log(`Matching an element that is already matched by the same conversion '${conversion.name}' via its parent, ignoring nested child. ${parent} > ${current}, found in ${foundFileLine}.`);
                    return;
                }

                lastSpanEndOriginalElement = endOffset;

                return {
                    from: originalElement,
                    to: elementConverter.convert(originalElement, elementDescription, currentFile)
                };

            } else {

                const line = (originalElement.startSourceSpan?.start.line as number) + 1;
                const foundFileLine = currentFile ? (currentFile + ':' + line) : `line ${line}`;

                const infoLogMsg = 'No match between the sourceElement ' +
                    originalElement.name + ' and the conversion named \'' + conversion.name + '\'. Source Element at ' + foundFileLine;

                if (ConverterConfig.verbose) {
                    console.log(infoLogMsg);
                }

            }
        }).filter(v => !!v);
        return conversionPairs as ConversionPair[];
    }

    private render(simpleElements: (SimpleTextElement|SimpleElement)[]|null, countSpaces: number): string {
        return simpleElements?.map(sE => (this.renderElement(sE, countSpaces) || '')).join('\r\n') || '';
    }

    private readonly indentionWhitespaces = 2;

    private renderElement(inp: (SimpleTextElement|SimpleElement)|null, spaces: number): string {
        if (!inp) {
            return '';
        }

        if (inp instanceof SimpleTextElement) {
            const textElementTrimmedValue = inp.value?.trim();
            return textElementTrimmedValue ? this.genSpace(spaces) + textElementTrimmedValue : '';
        }
        let out = this.genSpace(spaces) + '<' + inp.name + '';

        const theCurrentLength = out.length + 1;

        if (inp.attrs?.length) {
            const whiteSpaces = '\r\n' + this.genSpace(theCurrentLength);
            inp.attrs?.forEach((attr, i) => {
                const finalWhiteSpace = i === 0 ? ' ' : whiteSpaces;
                out += finalWhiteSpace + this.renderAttribute(attr)
            });
        }

        if (this.isVoidElement(inp)) {
            if (inp.childElements?.length) {
                throw new Error('a void element should not have child elements');
            }
            out += '/>'
            return out;
        }

        out += '>';
        inp.childElements?.forEach(child => {
            const s = this.renderElement(child, spaces + this.indentionWhitespaces);
            out += s ? '\r\n' + s : '';
        });
        out += '\r\n' + this.genSpace(spaces) + `</${inp.name}>`
        return out;
    }

    private renderAttribute(attr: SimpleAttribute) {
        return attr.value !== null && `${attr.name}="${attr.value}"` || `${attr.name}`
    }

    private countCurSpaces(angularTemplate: string, start: number): number {
        let c = 0;
        for (let i = start - 1; i >= 0; i--) {
            if (/\t/.test(angularTemplate.charAt(i))) {
                c += 4;
            } else if (/ /.test(angularTemplate.charAt(i))) {
                c += 1;
            } else {
                break;
            }
        }
        return c;
    }

    private genSpace(whiteSpaces: number) {
        let spaces = '';
        for (let i = 0; i < whiteSpaces; i++) {
            spaces += ' ';
        }
        return spaces;
    }

    private isVoidElement(inp: SimpleTextElement | SimpleElement):boolean {
        return inp.type === 'SimpleElement' && ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'].includes(inp.name);
    }
}

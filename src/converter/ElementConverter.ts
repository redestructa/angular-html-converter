import * as _ from 'lodash';
import * as html from "angular-html-parser/lib/compiler/src/ml_parser/ast";
import {Element} from "./description/Element";
import {Attribute} from "./description/Attribute";
import {SimpleElement} from "./simple/SimpleElement";
import {SimpleAttribute} from "./simple/SimpleAttribute";
import {Definition} from "./description/Definition";
import {SimpleTextElement} from "./simple/SimpleTextElement";
import {Conversion} from "./description/Conversion";
import {Matcher} from "./Matcher";

export class ElementConverter {

    constructor(private rootElement: html.Element, private rootElementDescription: Element, private conversion: Conversion, private definition: Definition) {
    }

    private targetVars: {
        [key: string]: html.Element | html.Attribute
    } = {};

    validate(originalElement: html.Element | html.Text, elementDescription: Element): boolean {

        if (originalElement.type === 'text') {
            return elementDescription.type === 'text';
        }

        if (elementDescription.strictChildMatch && elementDescription.copyChildElements) {
            throw new Error('you have set strictChildMatch to true and copyChildElements also to true, which is not compatible. ' +
                'Please be sure, whether you want to copy child elements to strictly match your configuration in the conversion named: ' + this.conversion.name);
        }

        // Remove white space elements
        // originalElement.children = originalElement.children.filter(child => child.type !== 'comment' && !(child.type === 'text' && child.value.trim() === ''));

        if (!Matcher.matches(originalElement, elementDescription)) {
            return false;
        }

        return this.validateChildren(originalElement, elementDescription);
    }

    private validateChildren(originalElement: html.Element, elementDescription: Element): boolean {

        // Filter only tags with real content / no comments / no empty texts (whitespaces)
        const filtered = originalElement.children.filter(child => child.type !== 'comment' && !(child.type === 'text' && child.value.trim() === ''));

        if (elementDescription.strictChildMatch) {
            return filtered.length === elementDescription.childElements?.length &&
                filtered.every((node, index) => {
                    const child = elementDescription.childElements?.[index] as Element;
                    if (!child) {
                        throw new Error('element must be set!');
                    }
                    switch (node.type) {
                        case 'element':
                            return this.validate(node, child);
                        case 'text':
                            return this.validate(node, child);
                    }
                    throw new Error('not supported type: ' + node.type);
                });
        } else {

            if (!elementDescription.childElements || !elementDescription.childElementDescriptionsMustMatch) {
                return true;
            }

            let lastIndex = 0;

            return elementDescription.childElements.every((childElementDescription, index) => {
                const foundElement = filtered.slice(lastIndex).find(toConvertChildElement => toConvertChildElement.type === 'element' && this.validate(toConvertChildElement, childElementDescription));
                if (foundElement) {
                    lastIndex = filtered.slice(lastIndex).indexOf(foundElement) + lastIndex;
                    return true;
                }
                return false;
            });

        }
    }

    convert(originalElement: html.Element, elementDescription: Element, currentFile?: string): (SimpleElement | SimpleTextElement)[] | null {
        this.targetVars = {};
        this.buildTargetVars(originalElement, elementDescription);

        if (Object.keys(this.targetVars).length > 0) {
            elementDescription = _.clone(elementDescription);
            elementDescription.attrs = _.cloneDeep(elementDescription.attrs);
        }

        return this.convertElement(originalElement, elementDescription, currentFile);
    }

    private convertElement(originalElement: html.Element, elementDescription: Element, currentFile?: string): (SimpleElement | SimpleTextElement)[] | null {

        // Convert
        if (elementDescription.remove) {
            return null;
        }

        const convertedElement = new SimpleElement();

        if (!elementDescription.unwrap) {
            convertedElement.name = elementDescription.rename || originalElement.name

            // Fill target vars, Caution: Mutable action
            elementDescription.attrs?.forEach(attr => attr.name = this.evaluateTargetVarOrSame(attr.name));

            if (elementDescription.copyAttrs) {
                convertedElement.attrs = originalElement.attrs
                    .filter(removeableAttribute => !Matcher.attributeContainedInDescription(elementDescription, removeableAttribute))
                    .map(a => this.buildSimpleAttribute(a))
            }

            if (elementDescription.attrs) {

                // Keep only attributes that are not receiving a special treatment (By the attribute description)
                // convertedElement.attrs = convertedElement.attrs.filter(a => !Matcher.attributeContainedInDescription(elementDescription, a))

                // Now mod them as described
                elementDescription.attrs.forEach(attributeDescription => {
                    const originalAttribute = this.getOriginalAttribute(originalElement, attributeDescription) as html.Attribute;
                    const convertedAttribute = this.convertAttribute(originalAttribute, attributeDescription);
                    if (convertedAttribute) {
                        convertedElement.attrs.push(convertedAttribute);
                    }
                });
            }

            if (elementDescription.removeClass?.length || elementDescription.addClass?.length) {
                if (convertedElement.attrs.find(attr => attr.name === '[class]')) {
                    throw new Error('angular class binding detected. Currently not supported.')
                }
                if (elementDescription.removeClass?.length) {
                    const simpleAttribute = convertedElement.attrs.find(attr => attr.name === 'class');
                    if (simpleAttribute && simpleAttribute.value?.length) {
                        elementDescription.removeClass.forEach(removeClass => {
                                simpleAttribute.value = (simpleAttribute.value as string)
                                    .replace(removeClass, '')
                                    .trim()
                                    .replace('  ', ' ')
                            }
                        )
                    }
                }
                if (elementDescription.addClass?.length) {
                    const simpleAttribute = convertedElement.attrs.find(attr => attr.name === 'class');
                    if (simpleAttribute && simpleAttribute.value?.length) {
                        elementDescription.addClass?.forEach(newClassString => {
                            if (!Matcher.classStringContainsClass(simpleAttribute.value as string, newClassString)) {
                                simpleAttribute.value += ' ' + newClassString;
                            }
                        })
                    } else if (simpleAttribute) {
                        simpleAttribute.value = '';
                        elementDescription.addClass?.forEach(newClassString => {
                            simpleAttribute.value += ' ' + newClassString;
                        })
                    } else {
                        convertedElement.attrs.push(new SimpleAttribute('class', elementDescription.addClass.join(' ')))
                    }
                }
            }

            this.removeEmptyClass(convertedElement);
        }

        if (elementDescription.innerHtml) {

            const simpleTextElement = new SimpleTextElement();
            simpleTextElement.value = this.evaluateTargetVarOrSame(elementDescription.innerHtml)
            convertedElement.childElements = [simpleTextElement]

        } else if (elementDescription.flattenDeepText) {

            const simpleTextElement = new SimpleTextElement();
            simpleTextElement.value = this.getTextFromHtmlElement(originalElement);
            convertedElement.childElements = [simpleTextElement]

        } else if (!elementDescription.removeChildElements) {
            // Es werden Paare gebildet. Jedes Element in der aktuellen DOM bekommt einen deskriptor, wie convertiert werden soll.
            // Ist copyChildElements true und wird kein passender Deskriptor gefunden, wird ein Paar aus dem Element und undefined gebildet.
            // Später wird im Falle von undefined nur eine Kopie, keine Konvertierung erstellt und dem convertedElement als Child hinzugefügt.
            const isCopyModeOn = elementDescription.copyChildElements;
            // Build pairs
            originalElement.children.map(childElement => {
                const childDescription = elementDescription.childElements?.find(childDescription => {
                    return childElement.type === 'element' && Matcher.matches(childElement, childDescription);
                });
                // Returns childDescription as undef if copyMode is on
                if (childDescription || isCopyModeOn) {
                    return {childElement, childDescription}
                }
            }).forEach(pair => {
                if (!pair) {
                    return;
                }
                const originalChildElement = pair.childElement;
                if (this.isEmptyTextElement(originalChildElement)) {
                    return;
                }
                const items = pair.childDescription ?
                    this.convertElement(originalChildElement as html.Element, pair.childDescription, currentFile) :
                    [this.copyNode(originalChildElement) as (SimpleElement | SimpleTextElement)];
                items?.forEach(el => convertedElement.childElements.push(el));
            });
        }
        if (elementDescription.unwrap) {
            if (elementDescription.mergeAttrsWhenUnwrap) {
                convertedElement.childElements.forEach(elem => {
                    if (elem.type === 'SimpleElement') {

                        originalElement.attrs.map(a => this.buildSimpleAttribute(a)).forEach(originalAttr => {

                            if (elem.attrs.find(existingSubAttr => existingSubAttr.name === originalAttr.name)) {

                                const line = (originalElement.startSourceSpan?.start.line as number) + 1;
                                const foundFileLine = currentFile ? (currentFile + ':' + line) : `line ${line}`;

                                throw new Error('a name with the element exists already in ' + foundFileLine)
                            }

                            elem.attrs.push(originalAttr);

                        });


                    } else {
                        const line = (originalElement.startSourceSpan?.start.line as number) + 1;
                        const foundFileLine = currentFile ? (currentFile + ':' + line) : `line ${line}`;

                        throw new Error('Please handle manually: Found a text element unwrapped in ' + foundFileLine)
                    }
                });
            }
            return convertedElement.childElements;
        }
        if (elementDescription.wrapIn) {
            const newWrapper = new SimpleElement();
            newWrapper.name = elementDescription.wrapIn.name;
            elementDescription.wrapIn.attrs?.map((attributeDescription: Attribute) => this.convertAttribute(null, attributeDescription)).forEach(a => a && newWrapper.attrs.push(a));
            newWrapper.childElements = [convertedElement];
            return [newWrapper];
        }
        return [convertedElement];
    }

    private removeEmptyClass(convertedElement: SimpleElement) {
        const simpleAttribute = convertedElement.attrs.find(attr => attr.name === 'class');
        if (simpleAttribute && !simpleAttribute.value?.trim()) {
            convertedElement.attrs.splice(convertedElement.attrs.indexOf(simpleAttribute), 1);
        }
    }

    private buildSimpleAttribute(a: html.Attribute): SimpleAttribute {
        return new SimpleAttribute(a.name, ElementConverter.getOriginalAttributeValue(a));
    }

    private isEmptyTextElement(originalChildElement: html.Node) {
        return originalChildElement.type === 'text' && originalChildElement.value.trim() === '';
    }

    private buildTargetVars(originalElement: html.Element, elementDescription: Element): void {
        if (elementDescription.targetVar) {
            this.targetVars[elementDescription.targetVar] = originalElement;
        }
        elementDescription.attrs?.forEach(attributeDescription => {
            if (typeof attributeDescription.targetVar === 'string' && attributeDescription.targetVar.length > 0) {
                const originalAttribute = this.getOriginalAttribute(originalElement, attributeDescription);
                if (!originalAttribute) {
                    console.warn('You defined a targetVar for a non-existing attribute, named: ' + attributeDescription.name + '. Conversion: ' + this.conversion.name);
                } else {
                    this.targetVars[attributeDescription.targetVar] = originalAttribute;
                }
            }
        });
        elementDescription.childElements?.forEach(childElementDescription => {
            const contextHtmlElement = this.getContextHtmlElement(originalElement, childElementDescription, elementDescription.childElementDescriptionsMustMatch);
            if (contextHtmlElement) {
                this.buildTargetVars(contextHtmlElement, childElementDescription);
            }
        });
    }

    private getContextHtmlElement(originalElement: html.Element, childElementDescription: Element, mustMatch = true): html.Element | undefined {
        const element = originalElement.children.find(childElement => childElement.type === 'element' && Matcher.matches(childElement, childElementDescription));
        if (!element && mustMatch) {
            throw new Error('could not get context element');
        }
        return element as (html.Element | undefined);
    }

    private getOriginalAttribute(originalElement: html.Element, attributeDescription: Attribute): html.Attribute | undefined {
        return originalElement.attrs.find(a => Matcher.matchAttributeDescription(a, attributeDescription));
    }

    private convertAttribute(originalAttribute: html.Attribute|null, attributeDescription: Attribute): SimpleAttribute|null {
        if (!attributeDescription.remove) {
            const convertedAttributeName = this.convertAttributeName(attributeDescription, originalAttribute);
            if (!attributeDescription.value && !originalAttribute) {
                return null;
            }
            const convertedAttributeValue = this.convertAttributeValue(originalAttribute, attributeDescription);
            return new SimpleAttribute(convertedAttributeName, convertedAttributeValue);
        }
        return null;
    }

    private convertAttributeName(attributeDescription: Attribute, originalAttribute: html.Attribute | null) {
        if (attributeDescription.inheritAngularBindingType &&
            attributeDescription.rename &&
            !this.attributeDescriptionRenameSurroundedByBraces(attributeDescription)
        ) {
            if (/^\[\(.{1,}\)\]$/.test(originalAttribute?.name || '')) {
                return '[(' + attributeDescription.rename + ')]';
            }
            if (/^\[.{1,}\]$/.test(originalAttribute?.name || '')) {
                return '[' + attributeDescription.rename + ']';
            }
            if (/^\(.{1,}\)$/.test(originalAttribute?.name || '')) {
                return '(' + attributeDescription.rename + ')';
            }
        }
        return attributeDescription.rename || originalAttribute?.name || attributeDescription.name;
    }

    private attributeDescriptionRenameSurroundedByBraces(attributeDescription: Attribute) {
        return /^\[.{1,}\]$/.test(attributeDescription.rename || '') ||
            /^\[\(.{1,}\)\]$/.test(attributeDescription.rename || '') ||
            /^\(.{1,}\)$/.test(attributeDescription.rename || '');
    }

    static getOriginalAttributeValue(originalAttribute: html.Attribute): null | string {
        return originalAttribute.valueSpan === null ? null : originalAttribute.value;
    }

    private convertAttributeValue(originalAttribute: html.Attribute|null, attributeDescription: Attribute): string|null {
        let currentValue
        if (attributeDescription.value) {
            currentValue = attributeDescription.value.trim();
            currentValue = this.evaluateTargetVarOrSame(currentValue);
        } else {
            currentValue = originalAttribute ? ElementConverter.getOriginalAttributeValue(originalAttribute) : null;
        }
        return currentValue === null ? null : this.applySearchReplaceMap(attributeDescription.searchReplaceMap?.trim(), currentValue);
    }

    private evaluateTargetVarOrSame(currentValue: string) {
        while (this.usesEvaluationBraces(currentValue)) {
            const firstMatch = (currentValue.match(/\$\{.+?}/) as string[])[0] as string;
            currentValue = currentValue.replace(firstMatch, this.evaluateTargetVar(firstMatch));
        }
        return currentValue;
    }

    private usesEvaluationBraces(currentValue: string): boolean {
        return /\$\{.+?}/.test(currentValue);
    }

    private evaluateTargetVar(path: string): string {

        let insideBraces = path.substring(2, path.length - 1).trim();
        let searchReplaceMap;

        const searchReplaceRegex = /^searchReplace\s*\(\s*(\w+?)\s*,\s*(\S+)\s*\)$/;
        if (searchReplaceRegex.test(insideBraces)) {
            const matches = insideBraces.match(searchReplaceRegex);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            searchReplaceMap = matches[1] as string;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            insideBraces = matches[2] as string;

        }

        const parts = insideBraces.split('.');

        let curRetVal: any = null;

        let curIndex = parts.shift();

        if (curIndex) {
            curRetVal = this.targetVars[curIndex];
            // Recursive assignment of the next path index
        }
        if (!curRetVal) {
            throw new Error(`your target var could not be assigned. please ensure, that the html element/attribute, to which your targetVar '${path}' is pointing to, exists`)
        }
        // eslint-disable-next-line no-cond-assign
        while (curIndex = parts.shift()) {
            if (curRetVal instanceof html.Element && curIndex === 'textContent') {
                curRetVal = this.getTextFromHtmlElement(curRetVal);
            } else {
                curRetVal = curRetVal[curIndex];
            }
        }

        if (typeof curRetVal !== 'string') {
            throw new Error('expected to be a string: ' + curRetVal + '. Path was: ' + path);
        }

        curRetVal = searchReplaceMap ? this.applySearchReplaceMap(searchReplaceMap, curRetVal) : curRetVal;

        return curRetVal as string;
    }

    private escapeRegExp(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    private applySearchReplaceMap(searchReplaceMap: string | undefined, currentValue: string): string {

        let valueChanged = false;

        if (!searchReplaceMap) {
            return currentValue;
        }

        const replaceMap = this.definition.searchReplaceMaps?.find(smap => smap.name === searchReplaceMap);

        if (!replaceMap) {
            throw new Error('Replace map with name \'' + searchReplaceMap + '\' not found. The name in the yaml is either invalid or it has never been set');
        }

        const flags = replaceMap.ignoreCase ? 'ig' : 'g';

        // apply replaceMap
        replaceMap.replacements.forEach(replacement => {
            if (replaceMap.wholeWord && currentValue === replacement.search) {
                currentValue = replacement.replace;
                valueChanged = true;
                return;
            }

            const escapeRegExp = this.escapeRegExp(replacement.search);
            const finalRegexPattern = replaceMap.wholeWord ? '\\b' + escapeRegExp + '\\b' : escapeRegExp;
            const regexp = new RegExp(finalRegexPattern, flags);

            if (regexp.test(currentValue)) {
                currentValue = currentValue.replace(regexp, replacement.replace);
                valueChanged = true;
            } else if (replaceMap.wholeWord && /\W/.test(replacement.search) && (new RegExp(escapeRegExp, flags)).test(currentValue)) {
                console.warn(`You have WholeWord search on for using a search map with a non-word character. Search and replace may fail unintended. Search after "${replacement.search}" in "${currentValue}"`);
            }
        });

        if (!valueChanged) {
            console.log(`did not find any match by given replacement map ${searchReplaceMap} and currentValue: ${currentValue}`)
        }

        return currentValue;
    }

    private getTextFromHtmlElement(htmlElement: html.Node): string {
        if (!htmlElement) {
            return '';
        }
        if (htmlElement.type === 'text') {
            return (htmlElement as html.Text).value?.trim() || '';
        }
        if (htmlElement.type === 'element') {
            const strings = htmlElement.children.map(child => this.getTextFromHtmlElement(child)).filter(v => v.length > 0);
            return strings.join(' ');
        }
        throw new Error('unknown type of Node to get text out of it: ' + htmlElement.type);
    }

    private copyNode(node: html.Node): null | SimpleElement | SimpleTextElement {
        if (node.type === 'text') {
            return this.copyTextElement(node);
        }
        if (node.type === 'element') {
            return this.copyElement(node as html.Element);
        }
        if (node.type === 'comment') {
            const s = new SimpleTextElement();
            s.value = '<!-- ' + node.value + ' -->'
            return s;
        }
        throw new Error("tried to copy an unhandled node");
    }

    private copyTextElement(node: html.Text) {
        const element = new SimpleTextElement();
        element.value = node.value;
        return element;
    }

    private copyElement(node: html.Element) {
        const element = new SimpleElement();
        element.name = node.name;
        node.attrs?.forEach((attribute:html.Attribute) => element.attrs.push(this.buildSimpleAttribute(attribute)));
        node.children?.forEach(child => {
            const childCopy = this.copyNode(child);
            if (childCopy) {
                element.childElements.push(childCopy);
            }
        });
        return element;
    }
}
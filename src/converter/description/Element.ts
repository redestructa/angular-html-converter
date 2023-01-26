import {Attribute} from "./Attribute";
import {WrapInElement} from "./WrapInElement";

export class Element {

    __brand = 'ElementDescription' as const;

    get attributesFromSelector(): { [p: string]: string|null } {
        return this._attributesFromSelector;
    }

    private _selector!: string;

    name!: string;
    type: 'element'|'text' = 'element';
    rename?: string;
    copyAttrs!: boolean;
    flattenDeepText!: boolean;
    mustHaveClasses?: string[];
    removeClass?: string[];
    addClass?: string[];

    childElementDescriptionsMustMatch!: boolean;
    attrs?: Attribute[];
    removeChildElements!: boolean;
    strictChildMatch!: boolean;
    copyChildElements!: boolean;
    remove!: boolean;
    unwrap!: boolean;
    mergeAttrsWhenUnwrap!: boolean;
    childElements?: Element[];
    targetVar?: string;
    wrapIn?: WrapInElement;
    innerHtml?: string;

    private _attributesFromSelector: {
        [key: string]: string|null
    } = {};

    get selector(): string {
        return this._selector;
    }

    set selector(value: string) {
        if (!value) {
            throw new Error('please provide a selector');
        }
        this.name = this.extractName(value);
        this._selector = value;
        this.buildAttributesBySelector(value);

        if (this.name !== this._selector && Object.keys(this._attributesFromSelector).length === 0) {
            this._attributesFromSelector['___invalid___'] = '___invalid___'
        }
    }

    private buildAttributesBySelector(value: string) {
        const regExp = /^(\w[\w\d-_]*?|\*)(\[\[?[^\=]*?\]?\=.*?\]|\[\[?[^\=]*?\]?\])+/;
        if (regExp.test(value)) {
            const regExpMatchArray = value.match(/(\[\[?[^\=]*?\]?\=.*?\]|\[\[?[^\=]*?\]?\])/g);
            if (!regExpMatchArray) {
                throw new Error('todo better error message');
            }
            regExpMatchArray.forEach(attrSelector => {
                if (attrSelector.includes('=')) {
                    const attrName = attrSelector.substring(1, attrSelector.indexOf('=')).trim();
                    const attrValue = attrSelector.substring(attrSelector.indexOf('=') + 1, attrSelector.length - 1).trim();
                    if (!attrValue || !attrName) {
                        throw new Error('could not extract attr selector');
                    }
                    this._attributesFromSelector[attrName] = this.unquote(attrValue);
                } else {
                    this._attributesFromSelector[attrSelector.substring(1, attrSelector.length - 1)] = null;
                }
            });
        }
    }

    private extractName(value: string): string {
        const regExp = /^(\w[\w\d-_]*|\*)\[?/;
        if (!regExp.test(value)) {
            throw new Error('unable to extract name for selector: ' + value);
        }
        const regExpMatchArray = value.match(regExp);
        return regExpMatchArray && regExpMatchArray[1] || (()=>{
            throw new Error('unable to extract name for selector: ' + value)
        })();
    }

    private unquote(attrValue: string) {
        if (/^['"].*['"]$/.test(attrValue)) {
            return attrValue.substring(1, attrValue.length - 1);
        }
        return attrValue;
    }
}
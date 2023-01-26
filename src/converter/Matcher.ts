import * as html from "angular-html-parser/lib/compiler/src/ml_parser/ast";
import {Element} from "./description/Element";
import {Attribute} from "./description/Attribute";
import {SimpleAttribute} from "./simple/SimpleAttribute";
import {ElementConverter} from "./ElementConverter";

export class Matcher {

    static matches(originalElement: html.Element, elementDescription: Element): boolean {
        if (elementDescription.name !== '*' && originalElement.name.toLowerCase() !== elementDescription.name.toLowerCase()) {
            return false;
        }
        // Passt der selektor mit attributen zu dem element
        for (const key in elementDescription.attributesFromSelector) {
            const value = elementDescription.attributesFromSelector[key];
            if (!originalElement.attrs?.find(attr => this.matchAttributeNames(key, attr.name) && (value === null || ElementConverter.getOriginalAttributeValue(attr) === value))) {
                return false;
            }
        }
        if (elementDescription.mustHaveClasses) {
            const classAttrib = originalElement.attrs.find((a:html.Attribute) => a.name === 'class');
            if (!classAttrib) {
                return false;
            }
            return elementDescription.mustHaveClasses.every(mustHaveClass => Matcher.classStringContainsClass(classAttrib.value, mustHaveClass));
        }
        return true;
    }

    static attributeContainedInDescription(elementDescription: Element, a: (html.Attribute | SimpleAttribute)): boolean {
        return !!elementDescription.attrs?.find(attrDescr => Matcher.matchAttributeDescription(a, attrDescr));
    }

    static checkChildrenDescriptionMatch(originalElement: html.Element, elementDescription: Element): boolean {
        if (!elementDescription.childElements) {
            return true;
        }
        let lastIndex = 0;
        return elementDescription.childElements.every((childElement, index) => {
            const foundElement = originalElement.children.slice(lastIndex).find(toConvertChildElement => toConvertChildElement.type === 'element' && Matcher.matches(toConvertChildElement, childElement));
            if (foundElement) {
                lastIndex = originalElement.children.slice(lastIndex).indexOf(foundElement) + lastIndex;
                return true;
            }
            return false;
        });
    }

    static matchAttributeDescription(a: (html.Attribute | SimpleAttribute), attributeDescription: Attribute) {
        return this.matchAttributeNames(attributeDescription.name, a.name);
    }

    static matchAttributeNames(a: string, b: string) {
        return a === b || `[${a}]` === b || `[${b}]` === a || this.complexMatch(a, b);
    }

    static complexMatch(a: string, b: string) {

        if (!a) {
            console.warn('a is not given');
        }

        if (!a.trim) {
            console.warn('trim is not given');
        }

        if (!b) {
            console.warn('b is not given');
        }

        a = a.trim().toLowerCase();
        b = b.trim().toLowerCase();
        return a === b || `[${a}]` === b || `[${b}]` === a || `(${a})` === b || `(${b})` === a || `[(${a})]` === b || `[(${b})]` === a;
    }

    static classStringContainsClass(className: string, searchKey: string):boolean {
        return className.split(/\s/).map(str => str.trim()).includes(searchKey);
    }
}
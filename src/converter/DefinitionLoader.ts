import {Definition} from "./description/Definition";
import {parse} from 'yaml'
import {DefinitionInterface} from "./description/interfaces/DefinitionInterface";
import {SearchReplaceMapInterface} from "./description/interfaces/SearchReplaceMapInterface";
import {SearchReplaceMap} from "./description/SearchReplaceMap";
import {ReplacementInterface} from "./description/interfaces/ReplacementInterface";
import {Replacement} from "./description/Replacement";
import {ConversionInterface} from "./description/interfaces/ConversionInterface";
import {Conversion} from "./description/Conversion";
import {ElementInterface} from "./description/interfaces/ElementInterface";
import {Element} from "./description/Element";
import {AttributeInterface} from "./description/interfaces/AttributeInterface";
import {Attribute} from "./description/Attribute";
import {WrapInElement} from "./description/WrapInElement";
import {WrapInElementInterface} from "./description/interfaces/WrapInElementInterface";

export class DefinitionLoader {

    load(fileContent: string): Definition|undefined {
        return this.yamlToDefinition(parse(fileContent));
    }

    private yamlToDefinition(definitionYaml: DefinitionInterface): Definition|undefined {
        const definition = new Definition();
        if (!definitionYaml?.conversions) {
            return;
        }
        definition.conversions = definitionYaml.conversions.map(c => this.toConversion(c));
        definition.searchReplaceMaps = definitionYaml.searchReplaceMaps?.map(srm => this.toReplaceMap(srm));

         this.assertUniqueConversionNames(definition.conversions)

        return definition;
    }

    private toConversion(conversion:ConversionInterface):Conversion {
        const c = new Conversion();
        c.name = conversion.name;
        c.element = this.toElement(conversion.element);
        return c;
    }

    private toReplaceMap(searchReplaceMapInterface: SearchReplaceMapInterface):SearchReplaceMap {
        const srmObj = new SearchReplaceMap();
        srmObj.name = searchReplaceMapInterface.name;
        srmObj.ignoreCase = searchReplaceMapInterface.ignoreCase || false;
        srmObj.wholeWord = searchReplaceMapInterface.wholeWord || false;
        srmObj.replacements = searchReplaceMapInterface.replacements?.map(replacementInterface => this.toReplacement(replacementInterface)) || [];
        return srmObj;
    }


    private toReplacement(replacementInterface: ReplacementInterface): Replacement {
        const replacement = new Replacement();
        if (!replacementInterface.search || typeof replacementInterface.replace !== 'string') {
            throw new Error('Search and replace must be set')
        }
        replacement.search = replacementInterface.search;
        replacement.replace = replacementInterface.replace;
        return replacement;
    }

    private toElement(element: ElementInterface): Element {

        const e = new Element();

        if (!element.selector) {
            throw new Error('please provide a selector')
        }

        e.type = element.type || 'element';
        if (e.type === 'text') {
            return e;
        }

        if (e.type !== 'element' && e.type !== 'text') {
            throw new Error('Element must be of type text or element')
        }

        e.selector = element.selector;
        e.copyAttrs = this.getValueOrDefaultBoolean(element.copyAttrs, true);
        e.flattenDeepText = this.getValueOrDefaultBoolean(element.flattenDeepText, false);

        e.targetVar = element.targetVar;
        e.removeClass = element.removeClass;
        e.addClass = element.addClass;
        e.mustHaveClasses = element.mustHaveClasses;

        if (element.wrapIn) {
            e.wrapIn = this.toWrapIn(element.wrapIn);
        }

        e.removeChildElements = !!element.removeChildElements;

        e.innerHtml = element.innerHtml;
        if (e.innerHtml?.length) {
            e.removeChildElements = true;
        }

        e.strictChildMatch = !!element.strictChildMatch;

        const canCopyChildElementsPerDefault = !e.strictChildMatch && !e.removeChildElements;

        e.copyChildElements = this.getValueOrDefaultBoolean(element.copyChildElements, canCopyChildElementsPerDefault);
        e.childElementDescriptionsMustMatch = this.getValueOrDefaultBoolean(element.childElementDescriptionsMustMatch, true);

        e.unwrap = !!element.unwrap;
        e.mergeAttrsWhenUnwrap = !!element.mergeAttrsWhenUnwrap;
        e.remove = !!element.remove;
        e.rename = element.rename;
        e.childElements = element.childElements?.map(ce => this.toElement(ce)) || [];
        e.attrs = element.attrs?.map(a => this.toAttribute(a));



        return e;
    }

    private toAttribute(attributeInterface: AttributeInterface): Attribute {

        const attribute = new Attribute();

        if (!attributeInterface.name) {
            throw new Error('a name must be set for an attribute description');
        }

        attribute.name = attributeInterface.name;
        attribute.rename = attributeInterface.rename;
        attribute.searchReplaceMap = attributeInterface.searchReplaceMap;
        attribute.inheritAngularBindingType = this.getValueOrDefaultBoolean(attributeInterface.inheritAngularBindingType, true);
        attribute.value = attributeInterface.value;
        attribute.targetVar = attributeInterface.targetVar;
        attribute.remove = attributeInterface.remove || false;

        return attribute;
    }

    private getValueOrDefaultBoolean(setValue: any, orDefault: boolean):boolean {
        return setValue === undefined ? orDefault : !!setValue;
    }

    private assertUniqueConversionNames(conversions: Conversion[]) {
        const names: { [key: string]: boolean } = {};
        conversions.forEach(c => {
            if (!c.name) {
                throw new Error('found a conversion with no name')
            }
            if (names[c.name]) {
                throw new Error('conversion name must be unique. found conversion name twice: ' + c.name)
            }
            names[c.name] = true;
        })
    }

    private toWrapIn(wrapIn: WrapInElementInterface):WrapInElement {

        const newElement = new WrapInElement();
        newElement.name = wrapIn.name;
        newElement.attrs = wrapIn.attrs?.map(a => this.toAttribute(a));
        return newElement;
    }
}


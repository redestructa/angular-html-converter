import {AttributeInterface} from "./AttributeInterface";
import {WrapInElementInterface} from "./WrapInElementInterface";

export interface ElementInterface {
    selector?: string;
    type: 'element'|'text';
    rename?: string;
    flattenDeepText: boolean;
    removeClass?: string[];
    addClass?: string[];
    mustHaveClasses?: string[];
    copyAttrs: boolean;
    attrs?: AttributeInterface[];
    childElementDescriptionsMustMatch?: boolean;
    copyChildElements?: boolean;
    removeChildElements?: boolean;
    innerHtml?: string;
    strictChildMatch?: boolean;
    remove?: boolean;
    unwrap?: boolean;
    mergeAttrsWhenUnwrap?: boolean;
    childElements: ElementInterface[];
    targetVar?: string;
    wrapIn?:WrapInElementInterface;
}
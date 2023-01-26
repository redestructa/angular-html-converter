import {SimpleAttribute} from "./SimpleAttribute";
import {SimpleTextElement} from "./SimpleTextElement";

export class SimpleElement {
    type = 'SimpleElement' as const;

    name!: string;
    attrs: SimpleAttribute[] = [];
    childElements: (SimpleElement|SimpleTextElement)[] = [];
}
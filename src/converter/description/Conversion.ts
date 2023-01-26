import {Element} from "./Element";

export class Conversion {
    __brand = 'Conversion' as const;
    name!: string;
    element!: Element;
}
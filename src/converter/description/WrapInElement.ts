import {Attribute} from "./Attribute";

export class WrapInElement {

    __brand = 'WrapInElementDescription' as const;

    name!: string;
    attrs?: Attribute[];

}
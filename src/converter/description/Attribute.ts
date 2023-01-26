export class Attribute {

    __brand = 'AttributeDescription' as const;

    name!: string;
    inheritAngularBindingType!: boolean;

    value?: string;
    rename?: string;
    searchReplaceMap?: string;
    targetVar?: string;
    remove?: boolean;
}



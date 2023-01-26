export class SimpleAttribute {

    name: string;
    value: string|null;
    type = 'SimpleAttribute' as const;

    constructor(name: string, value: string|null) {
        this.name = name;
        this.value = value;
    }

}



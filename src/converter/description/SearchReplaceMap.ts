import {Replacement} from "./Replacement";

export class SearchReplaceMap {

    __brand = 'SearchReplaceMap' as const;

    name!: string;
    wholeWord!: boolean;
    ignoreCase!: boolean;
    replacements!: Replacement[];
}
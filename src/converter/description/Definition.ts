import {Conversion} from "./Conversion";
import {SearchReplaceMap} from "./SearchReplaceMap";

export class Definition {
    __brand = 'Definition' as const;

    conversions!: Conversion[];
    searchReplaceMaps?: SearchReplaceMap[];
}
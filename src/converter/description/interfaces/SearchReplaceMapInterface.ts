import {ReplacementInterface} from "./ReplacementInterface";

export interface SearchReplaceMapInterface {
    name: string;
    wholeWord: boolean;
    ignoreCase: boolean;
    replacements: ReplacementInterface[];
}
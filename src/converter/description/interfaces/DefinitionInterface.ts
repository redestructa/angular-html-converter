import {ConversionInterface} from "./ConversionInterface";
import {SearchReplaceMapInterface} from "./SearchReplaceMapInterface";

export interface DefinitionInterface {
    conversions:ConversionInterface[];
    searchReplaceMaps:SearchReplaceMapInterface[];
}
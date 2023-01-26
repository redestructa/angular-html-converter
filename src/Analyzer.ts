import * as html from "angular-html-parser/lib/compiler/src/ml_parser/ast";
import * as _ from 'lodash';
import {getElementsByTagNameStartingWith} from "./utils";
import * as ngParser from "angular-html-parser";
import * as fs from "fs";

export interface AnlzHtmlElement {
    name:string;
    occurence:number;
}

export class Analyzer {

    private allElements!: html.Element[];
    private anlzElements!: AnlzHtmlElement[];

    analyze(arrayOfFileNames: string[]) {

        this.allElements = [];
        this.anlzElements = [];

        arrayOfFileNames.forEach(fileName => {
            const fileContent = fs.readFileSync(fileName, 'utf-8')
            getElementsByTagNameStartingWith(ngParser.parse(fileContent).rootNodes, 'ds-').forEach(item => this.allElements.push(item));
        });

        const group = _.groupBy(this.allElements, 'name');
        let groupName:string;
        for (groupName in group) {
            this.anlzElements.push({
                name:groupName,
                occurence:group[groupName].length
            });
        }
        this.anlzElements.sort((a,b)=>a.occurence-b.occurence);
        this.anlzElements.forEach(a => console.log(a))
    }
}
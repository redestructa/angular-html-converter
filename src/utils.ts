import * as html from "angular-html-parser/lib/compiler/src/ml_parser/ast";

export function getElementsByTagName(nodes:html.Node[], elementName: string): html.Element[] {
    let node: html.Node;
    const collector: html.Element[] = [];
    for (node of nodes) {
        if (node instanceof html.Element) {
            if (elementName === '*' || node.name.toLowerCase() === elementName.toLowerCase()) {
                collector.push(node);
            }
            if (node.children && node.children.length) {
                const childSearch: html.Element[] = getElementsByTagName(node.children, elementName);
                let elem:html.Element;
                for (elem of childSearch) {
                    collector.push(elem);
                }
            }
        }
    }
    return collector;
}

export function getElementsByTagNameStartingWith(nodes:html.Node[], elementNameStartingWith: string): html.Element[] {
    let node: html.Node;
    const collector: html.Element[] = [];
    for (node of nodes) {
        if (node instanceof html.Element) {
            if (node.name.toLowerCase().startsWith(elementNameStartingWith.toLowerCase())) {
                collector.push(node);
            }
            if (node.children && node.children.length) {
                const childSearch: html.Element[] = getElementsByTagNameStartingWith(node.children, elementNameStartingWith);
                let elem:html.Element;
                for (elem of childSearch) {
                    collector.push(elem);
                }
            }
        }
    }
    return collector;
}

export function sanitizeAttributeName(attr: string): string {
    return attr.replace(/^[[(]{0,2}(.+?)[\])]{0,2}$/, '$1').toLowerCase();
}

export function sanitizeAttributeNames(attrs: string[]): string[] {
    return attrs.map(attr => sanitizeAttributeName(attr));
}


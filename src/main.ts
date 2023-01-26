import * as fs from 'fs';
import {Converter} from "./converter/Converter";
import {DebounceRunner} from "./DebounceRunner";
import {getAllFiles, getYamlFilesOfPath} from "./utilities";
import {DefinitionLoader} from "./converter/DefinitionLoader";
import {Definition} from "./converter/description/Definition";
import {Analyzer} from "./Analyzer";
import {ConverterConfig} from "./ConverterConfig";

const configPath = __dirname + '\\..\\resources\\config.yml';
const conversionsFolder = __dirname + '\\..\\resources\\conversions';

function main(): void {

    try {
        ConverterConfig.configFileContent = fs.readFileSync(configPath, 'utf-8');
    } catch (e) {
        console.warn('could not load config ', configPath);
    }

    const editMode = ConverterConfig.editMode;

    const definitionLoader = new DefinitionLoader();
    const definitionHolder: { [key: string]: Definition | undefined } = {};

    if (!fs.existsSync(ConverterConfig.angularTemplateFolder)) {
        console.error('Please configure a correct folder to your angular template folder');
        process.exit(2);
    }

    const angularTemplateFilenames = getAllFiles(ConverterConfig.angularTemplateFolder, [], 'html');
    const convertionDefinitionFiles = getYamlFilesOfPath(conversionsFolder)

    console.log("Begin conversion");

    for (const originalHtmlFilename of angularTemplateFilenames) {

        const converter = new Converter();

        const originalCopyFilename = originalHtmlFilename + '.copy';
        const existsOriginalCopy = fs.existsSync(originalCopyFilename);

        const originalTemplate = existsOriginalCopy && !editMode ? fs.readFileSync(originalCopyFilename, 'utf-8') : fs.readFileSync(originalHtmlFilename, 'utf-8');

        let newFileContent = originalTemplate;
        convertionDefinitionFiles.forEach(convertionDefinitionFile => {
            const definition = Object.prototype.hasOwnProperty.call(definitionHolder, convertionDefinitionFile) ?
                definitionHolder[convertionDefinitionFile] : (
                    definitionHolder[convertionDefinitionFile] = definitionLoader.load(fs.readFileSync(convertionDefinitionFile, 'utf-8'))
                );

            newFileContent = converter.convertByDefinition(definition, newFileContent, originalHtmlFilename);
        });

        if (!existsOriginalCopy && !editMode) {
            fs.writeFileSync(originalCopyFilename, originalTemplate);
        }

        fs.writeFileSync(originalHtmlFilename, newFileContent);
    }

    console.log("Done conversion");

    if (ConverterConfig.analyze) {
        (new Analyzer()).analyze(angularTemplateFilenames);
    }
}

try {
    main();
} catch (e: any) {
    console.error(e);
    console.error(e?.message || '');
    console.error(e.stack);
}

const debounceRunner = new DebounceRunner()
fs.watch(conversionsFolder, (eventType, filename) => {
    console.log(eventType);
    debounceRunner.runDebounced(() => {
        try {
            main();
        } catch (e: any) {
            console.error(e);
            console.error(e?.message || '');
            console.error(e.stack);
        }
    });
});

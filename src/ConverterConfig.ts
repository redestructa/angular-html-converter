import {parse} from 'yaml'

export class ConverterConfig {

    static loadedConfig = false;
    static config = false;
    static configFileContent = '';

    static get analyze():boolean{
        return this.getParsed()?.analyze || false;
    }

    static get editMode():boolean{
        return this.getParsed()?.editMode || false;
    }

    static get angularTemplateFolder():string{
        return this.getParsed()?.angularTemplateFolder || '';
    }

    static get verbose():boolean{
        return this.getParsed()?.verbose || false;
    }

    private static getParsed():any{
        if (this.loadedConfig) {
            return this.config;
        }
        try {
            return this.config = parse(this.configFileContent);
        } catch (e) {
            console.warn('could not load config');
        }
    }
}
import * as fs from "fs";
import * as path from "path";

export function getAllFiles(dirPath: string, arrayOfFiles: string[], extension: string): string[] {
    const files = fs.readdirSync(dirPath)
    arrayOfFiles = arrayOfFiles || []
    files.forEach((file: string) => {
        if (file.toLowerCase().endsWith('.' + extension)) {
            arrayOfFiles.push(path.join(dirPath, '\\', file))
        } else if (fs.statSync(dirPath + "\\" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + '\\' + file, arrayOfFiles, extension)
        }
    })
    return arrayOfFiles;
}

export function getYamlFilesOfPath(dirPath: string): string[] {
    const strings = fs.readdirSync(dirPath).map((file: string) => {
        if (file.toLowerCase().endsWith('.yml') || file.toLowerCase().endsWith('.yaml')) {
            return path.join(dirPath, '\\', file)
        }
    }).filter(i => !!i) as string[];
    strings.sort((a, b) => {
        return a.localeCompare(b)
    })
    return strings;
}

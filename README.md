# Angular HTML Converter
A batch dom manipulation tool to convert, wrap, modify and exchange Angular HTML elements / web components and attributes via custom mapping definitions written in YAML

There are 2 ways to start this tool. 

(1) You can try an example live by starting the manual-test.html file,
but first: execute webpack in the src folder. 

(2) Running the converter via node-ts src/main.ts, but first: edit config.yml to match your Angular Project. Caution: it is destructive! unless you set editMode to false, which will cause converter to create copies to rely on. Meaning you shouldn't edit your template files while editing via this tool and your definition yaml files, which can also be done in live by the watcher in main.ts. Note, that your defintions should look like example.yml in your conversions folder (non-recursively)

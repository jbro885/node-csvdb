import csv = require("../csv-editor");
import create = require("./crud/create");
import erase = require("./crud/delete");
import get = require("./crud/read");
import update = require("./crud/update");
import init = require("./init");

import { ICSVEditor } from "../csv-editor/types";

const DEFAULT_DELIM = ";";

const database = (editor: ICSVEditor, delimiter?: string) => {
  return {
    get: (filter?: Object) => get(editor, filter),
    add: (data: Object[] | Object) => create(editor, data),
    edit: (filter: Object, data: Object) => update(editor, filter, data),
    delete: (predicate: Object) => erase(editor, predicate)
  };
};

const csvdb = async (filename: string, model: string[], delim?: string) => {
  const delimiter = delim ? delim : DEFAULT_DELIM;
  const editor = csv(filename, delimiter);

  await init(filename, model, delimiter, editor);
  return database(editor, delimiter);
};

export = csvdb;

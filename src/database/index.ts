import csv = require("../csv-factory");
import init = require("./init");
import get = require("./crud/read");
import erase = require("./crud/delete");
import createPackage = require("./crud/create");
const create = createPackage.readThenCreate;
import update = require("./crud/update");
import { ICSVEditor } from "../csv-factory/types";

const DEFAULT_DELIM = ";";

const database = (editor: ICSVEditor, delimiter?: string) => {
  return {
    get: (filter?) => get(editor, filter),
    add: data => create(editor, data),
    edit: (filter, data) => update(editor, filter, data),
    delete: predicate => erase(editor, predicate)
  };
};

const csvdb = async (filename: string, model: string[], delim?: string) => {
  let delimiter = delim ? delim : DEFAULT_DELIM;
  const editor = csv(filename, delimiter);

  await init(filename, model, delimiter, editor);
  return database(editor, delimiter);
};

export = csvdb;
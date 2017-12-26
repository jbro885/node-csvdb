import read = require("./read");
import utils = require("../../utils");

import { ICSVEditor, IEditEvents } from "../../csv-factory/types";

const erase = async (parser: ICSVEditor, predicate: Object) => {
  const deletedData = [];

  const deleteData = data => {
    if (utils.isSubsetOf(predicate, data)) {
      deletedData.push(data);
    } else return data;
  };

  const events: IEditEvents = {
    onEdit: deleteData
  };

  await parser.edit(events);
  return deletedData;
};

export = erase;

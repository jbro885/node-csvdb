import fastcsv = require("fast-csv");
import fs = require("fs");
import lockfile = require("proper-lockfile");
import tempy = require("tempy");

import { ICSVEditor, IEditEvents, IReadEvents } from "./types";

// Map SIGINT & SIGTERM to process exit
// so that lockfile removes the lockfile automatically
process
  .once("SIGINT", () => process.exit(1))
  .once("SIGTERM", () => process.exit(1));

// lock middleware to ensure async/thread safety
const lock = async (file: string, next) => {
  const release = await lockfile.lock(file, {
    retries: {
      retries: 500,
      factor: 3,
      minTimeout: 1 * 10,
      maxTimeout: 60 * 1000,
      randomize: true
    }
  });

  await next();
  release();
};

/** file i/o helpers */
const getCsvStream = (file: string, delimiter: string) => {
  // append flag : we only work with empty files or adding data
  const fileStream = fs.createWriteStream(file, { flags: "a" });
  const csvStream = fastcsv.createWriteStream({
    headers: true,
    delimiter
  });

  csvStream.pipe(fileStream);
  return csvStream;
};

const copyCsv = (from: string, to: string) =>
  new Promise((resolve, reject) => {
    const fromStream = fs.createReadStream(from);
    fromStream.on("error", reject);

    const toStream = fs.createWriteStream(to);
    toStream.on("error", reject).on("close", resolve);

    fromStream.pipe(toStream);
  });
/**  */

const read = async (filename: string, delimiter: string, events: IReadEvents) =>
  new Promise((resolve, reject) => {
    fastcsv
      .fromPath(filename, { delimiter, headers: true })
      .on("data", events.onData)
      .on("error", reject)
      .on("end", resolve);
  });

const edit = (filename: string, delimiter: string, events: IEditEvents) =>
  new Promise((resolve, reject) => {
    const copy = tempy.file();
    const tempStream = getCsvStream(copy, delimiter);

    fastcsv
      .fromPath(filename, { delimiter, headers: true })
      .on("data", data => {
        const newData = events.onEdit(data);
        // handling deletion case when editing returns nothing
        if (newData) {
          tempStream.write(newData);
        }
      })
      .on("error", reject)
      .on("end", () => {
        tempStream.end();
      });

    tempStream.on("end", () => {
      // copy data from tempfile to original file
      copyCsv(copy, filename)
        .then(resolve)
        .catch(reject);
    });
  });

const add = (filename: string, delimiter: string, data: Object[]) =>
  new Promise((resolve, reject) => {
    const copy = tempy.file();
    const tempStream = getCsvStream(copy, delimiter);

    fastcsv
      .fromPath(filename, { delimiter, headers: true })
      .on("error", reject)
      .on("end", () => {
        // appending data at end of file
        for (const row of data) {
          tempStream.write(row);
        }
        tempStream.end();
      })
      .pipe(tempStream);

    tempStream.on("end", () => {
      // copy data from tempfile to original file
      copyCsv(copy, filename)
        .then(resolve)
        .catch(reject);
    });
  });

const lockedEdit = async (
  filename: string,
  delimiter: string,
  events: IEditEvents
) => {
  const func = async () => edit(filename, delimiter, events);

  return lock(filename, func);
};

const lockedAdd = async (
  filename: string,
  delimiter: string,
  data: Object[]
) => {
  const func = async () => add(filename, delimiter, data);

  return lock(filename, func);
};

const csvEditor = (filename, delimiter): ICSVEditor => ({
  read: events => read(filename, delimiter, events),
  add: data => lockedAdd(filename, delimiter, data),
  edit: events => lockedEdit(filename, delimiter, events)
});

export = csvEditor;

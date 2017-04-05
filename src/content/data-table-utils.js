// @flow
/**
 * A "data table" is a JS object of the form:
 * {
 *   length: <length>
 *   someColumnName: SomeType[<length>]
 *   someOtherColumnName: SomeOtherType[<length>]
 * }
 */

type DataTable = {
  [key: string]: mixed[],
  length: number,
};

type compareFn<T> = { (a: T, b: T): number };

/**
 * Sorts the data table |table|, affecting all columns.
 * This is necessary because Array.prototype.sort doesn't let you sort
 * multiple arrays at the same time; you'd need to convert from
 * struct-of-arrays form to array-of-structs, sort, and convert back into
 * struct-of-arrays form.
 * This function lets you sort without conversion, and saves the garbage
 * allocation that this would cause.
 * @param {object}   table       The data table. Gets mutated.
 * @param {string}   keyColumn   The column whose values to pass to the
 *                               comparator function. E.g. table.time
 * @param {function} comparator  A comparator function that receives two
 *                               arguments which are values from keyColumn,
 *                               and behaves like one that you'd pass to
 *                               Array.prototype.sort.
 * @returns The data table.
 */
export function sortDataTable<KeyColumnElementType>(
   table: DataTable,
   keyColumn: KeyColumnElementType[],
   comparator: compareFn<KeyColumnElementType>
 ): DataTable {
  const tempRow: { [string]: any } = {};
  let tempKey;
  function remember(index: Number) {
    for (const columnName in table) {
      if (columnName !== 'length') {
        const column = table[columnName];
        tempRow[columnName] = column[index];
        tempKey = keyColumn[index];
      }
    }
  }

  function shiftRight(index: Number) {
    for (const columnName in table) {
      if (columnName !== 'length') {
        const column = table[columnName];
        column[index + 1] = column[index];
      }
    }
  }

  function restore(index: Number) {
    for (const columnName in table) {
      if (columnName !== 'length') {
        table[columnName][index] = tempRow[columnName];
      }
    }
  }

  for (let i = 1; i < table.length; i++) {
    remember(i);
    let j;
    for (j = i - 1; j >= 0 && comparator(keyColumn[j], tempKey) > 0; j--) {
      shiftRight(j);
    }
    restore(j + 1);
  }

  return table;
}

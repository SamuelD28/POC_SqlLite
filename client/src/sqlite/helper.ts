import { Result } from "./types";
import _ from "lodash";

export function isErrorEvent(object: any): object is ErrorEvent {
  return "error" in object;
}

export function mergeRows(
  rows: Record<string, any>,
  row: Record<string, any>
): Record<string, any> {
  const currentId = row["id"];
  if (currentId === undefined || currentId === null) {
    return rows;
  }

  if (rows[currentId] === undefined) {
    rows[currentId] = {};
  }

  for (const [property, value] of Object.entries(row)) {
    if (typeof value === "object") {
      if (!rows[currentId][property]) {
        rows[currentId][property] = {};
      }

      rows[currentId][property] = {
        ...rows[currentId][property],
        ...mergeRows(rows[currentId][property], row[property]),
      };
    } else {
      rows[currentId][property] = value;
    }
  }

  return rows;
}

export const lowerCaseFirst = (value: string) =>
  value[0].toLowerCase() + value.substring(1);

export function getPropertyName(
  property: string,
  result: Record<string, any>
): { propertyName: string; content: any } {
  let underscoreIndex = property.indexOf("_");

  if (underscoreIndex === -1) {
    return { propertyName: property, content: result };
  }

  const trimmedProperty = lowerCaseFirst(
    property.substring(0, underscoreIndex)
  );
  const restOfTheProperty = property.substring(underscoreIndex + 1);

  if (!result[trimmedProperty]) {
    result[trimmedProperty] = {};
  }

  return getPropertyName(restOfTheProperty, result[trimmedProperty]);
}

// Make recursive for object properties
export function convertRowToObject<T>(row: Record<string, any>): any {
  const result: Record<string, any> = {};

  // Extract all invidiual object from the columns
  for (let [property, value] of Object.entries(row)) {
    const { propertyName, content } = getPropertyName(property, result);
    content[lowerCaseFirst(propertyName)] = value;
  }

  return result;
}

// Make recursive for object properties
export function convertToObjects<T>(row: Result): T[] {
  return row.values.map((x) =>
    x.reduce(
      (previous, current, i) => ({
        ...previous,
        [row.columns[i].toLowerCase()]: current,
      }),
      {}
    )
  );
}
